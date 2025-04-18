import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as AWS from 'aws-sdk';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LpStackProps } from './interfaces';

export class MediaConverterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: LpStackProps) {
    super(scope, id, props);
    const uporcessedMediaBucketName = `${id}-unprocessed-media-${props?.environment}-${props?.accountId}`;
    const processedMediaBucketName = `${id}-processed-media-${props?.environment}-${props?.accountId}`;
    const mediaConverterRoleName = `${id}-role-mdia-conv-${props?.environment}-${props?.accountId}`;
    const lambdaMediaConverterRoleRoleName = `${id}-role-lmda-mdia-conv-${props?.environment}-${props?.accountId}`;
    const updateVideoStatusLambdaName = `${id}-lambda-update-status-${props?.environment}-${props?.accountId}`;
    const mediaConverterLambdaName = `${id}-lambda-mdia-conv-${props?.environment}-${props?.accountId}`;

  
    const unprocessedMediaBucket = new s3.Bucket(this, uporcessedMediaBucketName, {
      bucketName: uporcessedMediaBucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
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
    // use NodejsFunction for better performance
    const mediaConverterLambda = new NodejsFunction(this, mediaConverterLambdaName, {
      functionName: mediaConverterLambdaName,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: 'lambda/mediaConverter/index.ts',  // Lambda code directory
      environment: {
        MEDIA_CONVERT_ENDPOINT: mediaConvertEndpoint,
        MEDIA_CONVERTER_ROLE_ARN: mediaConvertRole.roleArn,
        S3_BUCKET_UNPROCESSED_MEDIA: unprocessedMediaBucket.bucketName,
        S3_BUCKET_PROCESSED_MEDIA: processedMediaBucket.bucketName,
      },
      role: mediaConvertLambdaRole,
    })
    
    // Create Lambda function to invoke Ec2 public IP
    const updateVideoStatusLambda = new NodejsFunction(this, updateVideoStatusLambdaName, {
      functionName: updateVideoStatusLambdaName,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: 'lambda/updateVideoStatus/index.ts',  // Lambda code directory
      environment: {
        LEARNING_PLATFORM_BASE_URL: ec2PublicIp,
      },
    })
    
    unprocessedMediaBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(mediaConverterLambda), {
      suffix: '.mp4',  // Trigger only for MP4 uploads
    });
    processedMediaBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(updateVideoStatusLambda), {
      suffix: '.m3u8',  // Trigger only for MP4 uploads
    });
  }
}
