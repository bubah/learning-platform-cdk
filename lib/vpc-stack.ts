import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ec2Instance: ec2.Instance;
  public readonly rdsInstance: rds.DatabaseInstance;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    this.vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 2, // Use two Availability Zones for better resilience
    });

    // Create an EC2 instance within the VPC
    this.ec2Instance = new ec2.Instance(this, 'MyEC2Instance', {
      instanceType: new ec2.InstanceType('t3.micro'),
      machineImage: new ec2.AmazonLinuxImage(),
      vpc: this.vpc,
    });

    // Create an RDS instance within the VPC
    this.rdsInstance = new rds.DatabaseInstance(this, 'MyRDSInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_23,
      }),
      vpc: this.vpc,
      instanceType: new ec2.InstanceType('t3.micro'),
    });

    // Output EC2 public IP (for use by other stacks)
    new cdk.CfnOutput(this, 'EC2PublicIP', {
      value: this.ec2Instance.instancePublicIp,
      exportName: 'EC2PublicIP', // Can be imported by other stacks
    });
  }
}
