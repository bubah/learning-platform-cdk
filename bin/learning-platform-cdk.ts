#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { S3LambdaStack } from '../lib/s3-lambda-stack';
import { MediaConverterStack } from '../lib/media-converter-stack';

const app = new cdk.App();
// Instantiate the VPC stack
const vpcStack = new VpcStack(app, 'VpcStack', {
    environment: 'dev', // Specify the environment name
});

// Instantiate the S3 and Lambda stack
const s3LambdaStack = new S3LambdaStack(app, 'S3LambdaStack');

// Instantiate the Media Converter stack and enforce dependencies
const mediaConverterStack = new MediaConverterStack(app, 'MediaConverterStack');

// Ensure the Media Converter stack depends on the VPC and S3Lambda stacks
mediaConverterStack.node.addDependency(vpcStack);
mediaConverterStack.node.addDependency(s3LambdaStack);


// new LearningPlatformCdkStack(app, 'LearningPlatformCdkStack', {
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   // env: { account: '123456789012', region: 'us-east-1' },

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
// });