import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as AWS from 'aws-sdk';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class MediaConverterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 buckets for input and output
    const s3A = new s3.Bucket(this, 'S3BucketA', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Change based on your need
    });
    const s3B = new s3.Bucket(this, 'S3BucketB', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Change based on your need
    });

    // Create MediaConvert role
    const mediaConvertRole = new iam.Role(this, 'MediaConvertRole', {
      assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
    });

    // Use AWS SDK to get MediaConvert endpoint
    const mediaConvertClient = new AWS.MediaConvert({ region: 'us-west-2' });
    const mediaConvertEndpoint = mediaConvertClient.endpoint.hostname; // Extract hostname as string

    // Create Lambda function to trigger MediaConvert job
    const mediaConverterLambda = new lambda.Function(this, 'MediaConverterLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/mediaConverter'),  // Lambda code directory
      environment: {
        MEDIA_CONVERT_ENDPOINT: mediaConvertEndpoint,
        S3_BUCKET_B: s3B.bucketName,
      },
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ['mediaconvert:CreateJob'],
          resources: ['*'],  // For simplicity, using * (narrow to specific resources if needed)
        }),
        new iam.PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject'],
          resources: [
            `${s3A.bucketArn}/*`,  // S3 bucket A permissions
            `${s3B.bucketArn}/*`,  // S3 bucket B permissions
          ],
        }),
      ],
    });

    s3A.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(mediaConverterLambda), {
      suffix: '.mp4',  // Trigger only for MP4 uploads
    });
  }
}
