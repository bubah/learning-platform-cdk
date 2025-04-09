import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class S3LambdaStack extends cdk.Stack {
  public readonly s3A: s3.Bucket;
  public readonly s3B: s3.Bucket;
  public readonly lambdaA: lambda.Function;
  public readonly lambdaB: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 Bucket A
    this.s3A = new s3.Bucket(this, 'S3BucketA');

    // Create S3 Bucket B
    this.s3B = new s3.Bucket(this, 'S3BucketB');

    // Lambda A triggered by events in S3A
    this.lambdaA = new lambda.Function(this, 'LambdaA', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'lambdaA.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    // Add S3 event notification to trigger Lambda A
    this.s3A.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.LambdaDestination(this.lambdaA));

    // Lambda B triggered by events in S3B
    this.lambdaB = new lambda.Function(this, 'LambdaB', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'lambdaB.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    // Add S3 event notification to trigger Lambda B
    this.s3B.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.LambdaDestination(this.lambdaB));

    // Output the names of the S3 buckets for use in other stacks
    new cdk.CfnOutput(this, 'S3BucketAName', {
      value: this.s3A.bucketName,
      exportName: 'S3BucketAName', // Can be imported by other stacks
    });

    new cdk.CfnOutput(this, 'S3BucketBName', {
      value: this.s3B.bucketName,
      exportName: 'S3BucketBName', // Can be imported by other stacks
    });
  }
}
