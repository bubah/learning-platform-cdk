import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { LpStackProps } from './interfaces';

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ec2Instance: ec2.Instance;
  public readonly rdsInstance: rds.DatabaseInstance;

constructor(scope: Construct, id: string, props?: LpStackProps) {
    super(scope, id, props);

    // Create a VPC
    this.vpc = new ec2.Vpc(this, `${id}-vpc-${props?.environment}-${props?.accountId}`, {
      maxAzs: 3, // Use two Availability Zones for better resilience
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: `${id}-subnet-${props?.environment}-${props?.accountId}-1`,
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: `${id}-subnet-${props?.environment}-${props?.accountId}-2`,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      natGateways: 0, // Use a single NAT Gateway for cost efficiency
    });

    // Create a Security Group allowing SSH (port 22) and HTTP (port 80)
    const ec2SecurityGroup = new ec2.SecurityGroup(this, `${id}-sg-ec2-${props?.environment}-${props?.accountId}`, {
        vpc: this.vpc,
        allowAllOutbound: true,
        description: 'Security Group allowing SSH and HTTP(s) and allows EC2 to RDS communication',
    });

    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS access');

    // Create an EC2 instance within the VPC
    const keyPair = ec2.KeyPair.fromKeyPairName(this, 'KeyPair', 'learning-platform-aws-acc-2');
    this.ec2Instance = new ec2.Instance(this, `${id}-ec2-${props?.environment}-${props?.accountId}`, {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      keyPair,
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: ec2SecurityGroup,
      vpc: this.vpc,
      associatePublicIpAddress: true, // Ensure the instance has a public IP
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Ensure EC2 is in public subnets
      },
    });

    // Create a security group for RDS
    const rdsSecurityGroup = new ec2.SecurityGroup(this, `${id}-sg-rds-${props?.environment}-${props?.accountId}`, {
        vpc: this.vpc,
        allowAllOutbound: true,
        description: 'Security Group allowing communication between EC2 and RDS',
    });
  
    // Allow inbound traffic on port 5432 (PSQL) from EC2 security group
    rdsSecurityGroup.addIngressRule(
        ec2.Peer.securityGroupId(ec2SecurityGroup.securityGroupId), // EC2 security group
        ec2.Port.tcp(5432), // MySQL default port
        'Allow EC2 to RDS communication on PSQL port'
    );

    // Allow inbound traffic from your local PC IP address (replace with your actual public IP)
    const whiteListedIps = props?.whiteListedIps || [];

    whiteListedIps.forEach((ip) => {
        rdsSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(ip), // Allow traffic from whitelisted IPs
            ec2.Port.tcp(5432), // PostgreSQL default port
            `Allow access to RDS on PostgreSQL port from ${ip}`
        );
    }
    );

    // Create the RDS instance and associate the security group
    this.rdsInstance = new rds.DatabaseInstance(this, `${id}-rds-${props?.environment}-${props?.accountId}`, {
        engine: rds.DatabaseInstanceEngine.postgres({
            version: rds.PostgresEngineVersion.VER_17_2
        }),
        vpc: this.vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
        securityGroups: [rdsSecurityGroup], // Attach the RDS security group here
        storageType: rds.StorageType.GP2,
        vpcSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Ensure RDS is in private subnets
        },
        removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for development/test environments,
        cloudwatchLogsExports: ['postgresql'],
        databaseName: `learningPlatformDb${props?.environment}`,
    });

    // Output EC2 public IP (for use by other stacks)
    new cdk.CfnOutput(this, 'EC2PublicIP', {
      value: this.ec2Instance.instancePublicIp,
      exportName: 'EC2PublicIP', // Can be imported by other stacks
    });
  }
}
