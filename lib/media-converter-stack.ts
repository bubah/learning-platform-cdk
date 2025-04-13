import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as AWS from 'aws-sdk';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

interface VpcStackProps extends cdk.StackProps {
  environment: string; // Environment name (e.g., dev, prod)
}
export class MediaConverterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: VpcStackProps) {
    super(scope, id, props);
    const uporcessedMediaBucketName = `unprocessed-media-${id}-${props?.environment}`;
    const processedMediaBucketName = `processed-media-${id}-${props?.environment}`;
    const mediaConverterRoleName = `media-converter-role-${id}-${props?.environment}`;
    const lambdaMediaConverterRoleRoleName = `lambda-media-converter-role-${id}-${props?.environment}`;
    const updateVideoStatusLambdaName = `update-video-status-lambda-${id}-${props?.environment}`;
    const mediaConverterLambdaName = `media-converter-lambda-${id}-${props?.environment}`;

  
    const unprocessedMediaBucket = new s3.Bucket(this, uporcessedMediaBucketName, {
      bucketName: uporcessedMediaBucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Change based on your need
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
    });

    const processedMediaBucket = new s3.Bucket(this, processedMediaBucketName, {
      bucketName: processedMediaBucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Change based on your need
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
    });

    const mediaConvertRole = new iam.Role(this, mediaConverterRoleName, {
      assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
      roleName: mediaConverterRoleName,
    });

    unprocessedMediaBucket.grantRead(mediaConvertRole);
    processedMediaBucket.grantWrite(mediaConvertRole);

    // Use AWS SDK to get MediaConvert endpoint
    const mediaConvertClient = new AWS.MediaConvert({ region: 'us-east-1' });
    const mediaConvertEndpoint = mediaConvertClient.endpoint.hostname; // Extract hostname as string

    // Lambda execution role with all necessary policies
    const mediaConvertLambdaRole = new iam.Role(this, lambdaMediaConverterRoleRoleName, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: lambdaMediaConverterRoleRoleName,
      description: 'Allows Lambda to access S3 and MediaConvert, and pass role to MediaConvert job',
    });

    // ✅ Allow basic Lambda logging
    mediaConvertLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );
    // ✅ Allow MediaConvert full access
    mediaConvertLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElementalMediaConvertFullAccess')
    );
    // Grant lambda role read permissions to the unprocessed media bucket
    unprocessedMediaBucket.grantRead(mediaConvertLambdaRole);

    // Allow lambda to pass role to mediaconvert job
    mediaConvertLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [mediaConvertRole.roleArn],
        effect: iam.Effect.ALLOW,
        conditions: {
          StringEquals: {
            'iam:PassedToService': 'mediaconvert.amazonaws.com',
          },
        },
      })
    );

    const ec2PublicIp = cdk.Fn.importValue('EC2PublicIP');
    // Create Lambda function to trigger MediaConvert job
    const mediaConverterLambda = new lambda.Function(this, mediaConverterLambdaName, {
      functionName: mediaConverterLambdaName,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/mediaConverter'),  // Lambda code directory
      environment: {
        MEDIA_CONVERT_ENDPOINT: mediaConvertEndpoint,
        MEDIA_CONVERTER_ROLE_ARN: mediaConvertRole.roleArn,
        // S3_BUCKET_UNPROCESSED_MEDIA: unprocessedMediaBucket.bucketName,
        // S3_BUCKET_PROCESSED_MEDIA: processedMediaBucket.bucketName,
      },
      role: mediaConvertLambdaRole,
    });

    // Create Lambda function to invoke Ec2 public IP
    const updateVideoStatusLambda = new lambda.Function(this, updateVideoStatusLambdaName, {
      functionName: updateVideoStatusLambdaName,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/ec2PublicIp'),
      environment: {
        LEARNING_PLATFORM_BASE_URL: `http://${ec2PublicIp}/`
      }
    });
    
    unprocessedMediaBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(mediaConverterLambda), {
      suffix: '.mp4',  // Trigger only for MP4 uploads
    });
    processedMediaBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(updateVideoStatusLambda), {
      suffix: '.m3u8',  // Trigger only for MP4 uploads
    });
  }
}
