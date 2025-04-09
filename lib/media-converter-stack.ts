import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class MediaConverterStack extends cdk.Stack {
  public readonly mediaConverterLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import S3 buckets (from another stack or create here)
    const s3AName = cdk.Fn.importValue('S3BucketAName');
    const s3BName = cdk.Fn.importValue('S3BucketBName');

    // Media Converter Lambda function
    this.mediaConverterLambda = new lambda.Function(this, 'MediaConverterLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'mediaConverter.handler',
      code: lambda.Code.fromAsset('lambda'), // Path to Lambda function code
      environment: {
        S3_A_BUCKET: s3AName,
        S3_B_BUCKET: s3BName,
      },
    });

    // Grant Lambda permissions to read from S3(A) and write to S3(B)
    const s3A = s3.Bucket.fromBucketName(this, 'S3BucketA', s3AName);
    const s3B = s3.Bucket.fromBucketName(this, 'S3BucketB', s3BName);
    s3A.grantRead(this.mediaConverterLambda);
    s3B.grantWrite(this.mediaConverterLambda);
  }
}
