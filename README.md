# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

Run the following command if running cdk deploy for the first time in aws account:

`npx cdk bootstrap --profile your-profile-name`

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npm run deploy:<environment>` deploy this stack to your default AWS account/region for the specified env (i.e dev, test, stage, prod)
* `npm run diff:<environment>`   compare deployed stack with current state for the specified environment (i.e dev, test, stage, prod)
* `npx cdk synth`   emits the synthesized CloudFormation template
