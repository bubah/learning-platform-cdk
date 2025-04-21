import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LpStackProps } from './interfaces';
import { readFileSync } from 'fs';
import { EC2_INSTANCE_ID, EC2_PUBLIC_IP, EC2_ROLE_NAME, LP_EC2_ROLE_ACTIONS, AMAZON_SSM_MANAGED_INSTANCE_CORE, keyPairName, PARAM_STORE_DEV_ARN } from './constants';

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
    const ec2SecurityGroup = new ec2.SecurityGroup(
      this,
      `${id}-sg-ec2-${props?.environment}-${props?.accountId}`,
      {
        vpc: this.vpc,
        allowAllOutbound: true,
        description: 'Security Group allowing SSH and HTTP(s) and allows EC2 to RDS communication',
      }
    );

    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS access');

    // Create an EC2 instance within the VPC
    const keyPair = ec2.KeyPair.fromKeyPairName(this, 'KeyPair', keyPairName);

    // Load user data script
    const scriptPath = path.join(__dirname, 'scripts', 'user-data.sh');
    const userDataScript = readFileSync(scriptPath, 'utf8');

    const ec2InstanceRole = new iam.Role(
      this,
      `${id}-role-ec2-${props?.environment}-${props?.accountId}`,
      {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        roleName: `${id}-role-ec2-${props?.environment}-${props?.accountId}`,
      }
    );

    ec2InstanceRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(AMAZON_SSM_MANAGED_INSTANCE_CORE)
    );

    ec2InstanceRole.addToPolicy(new iam.PolicyStatement({
      actions: LP_EC2_ROLE_ACTIONS,
      resources: [
        PARAM_STORE_DEV_ARN
      ],
    }));

    this.ec2Instance = new ec2.Instance(
      this,
      `${id}-ec2-${props?.environment}-${props?.accountId}`,
      {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        keyPair,
        machineImage: ec2.MachineImage.latestAmazonLinux2(),
        securityGroup: ec2SecurityGroup,
        vpc: this.vpc,
        associatePublicIpAddress: true, // Ensure the instance has a public IP
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC, // Ensure EC2 is in public subnets
        },
        role: ec2InstanceRole,
        userData: ec2.UserData.custom(userDataScript),
      }
    );

    // Create a security group for RDS
    const rdsSecurityGroup = new ec2.SecurityGroup(
      this,
      `${id}-sg-rds-${props?.environment}-${props?.accountId}`,
      {
        vpc: this.vpc,
        allowAllOutbound: true,
        description: 'Security Group allowing communication between EC2 and RDS',
      }
    );

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
    });

    // Create the RDS instance and associate the security group
    this.rdsInstance = new rds.DatabaseInstance(
      this,
      `${id}-rds-${props?.environment}-${props?.accountId}`,
      {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_17_2,
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
      }
    );

    // Output EC2 public IP (for use by other stacks)
    new cdk.CfnOutput(this, EC2_PUBLIC_IP, {
      value: this.ec2Instance.instancePublicIp,
      exportName: EC2_PUBLIC_IP, // Can be imported by other stacks
    });
  
    // Output EC2 Role (for use by other stacks)
    new cdk.CfnOutput(this, EC2_ROLE_NAME, {
      value: `${id}-role-ec2-${props?.environment}-${props?.accountId}`,
      exportName: EC2_ROLE_NAME, // Can be imported by other stacks
    });

    new cdk.CfnOutput(this, EC2_INSTANCE_ID, {
      value: this.ec2Instance.instanceId,
      exportName: EC2_INSTANCE_ID, // Optional, for cross-stack use
    });
  }
}

