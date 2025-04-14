#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { MediaConverterStack } from '../lib/media-converter-stack';

const ACCOUNT_ID = "805358685077"
const app = new cdk.App();
const vpcStack = new VpcStack(app, 'lp-vpcstack', {
    environment: 'dev',
    accountId: ACCOUNT_ID, // Replace with your actual account ID
    whiteListedIps: ["172.56.35.116/32", "162.83.152.212/32", "100.33.64.132/32"], // Replace with your actual IPs
});
const mediaConverterStack = new MediaConverterStack(app, 'lp-mediaconvstack', {
    environment: 'dev',
    accountId: ACCOUNT_ID, // Replace with your actual account ID
});

// Ensure the Media Converter stack depends on the VPC and S3Lambda stacks
mediaConverterStack.node.addDependency(vpcStack);


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