import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { LpStackProps } from './interfaces';

export class ContinousDeplymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: LpStackProps) {
    super(scope, id, props);

    const repo = "bubah/learning-platform";
    const branch = "master";

    const gitActionRoleName = `${id}-role-git-action-${props?.environment}-${props?.accountId}`;

    const ec2InstanceId = cdk.Fn.importValue('EC2InstanceId');

    const gitActionRole = new iam.Role(this, gitActionRoleName, {
      assumedBy: new iam.WebIdentityPrincipal(
        `arn:aws:iam::${cdk.Stack.of(this).account}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            [`token.actions.githubusercontent.com:sub`]: `repo:${repo}:ref:refs/heads/${branch}`,
          },
        }
      ),
      roleName: gitActionRoleName,
    });

    gitActionRole.addToPolicy(new iam.PolicyStatement({
        actions: ["ssm:SendCommand"],
        resources: [
          `arn:aws:ec2:${this.region}:${this.account}:instance/${ec2InstanceId}`, // Your EC2 instance
          `arn:aws:ssm:${this.region}:${this.account}:document/AWS-RunShellScript`
        ]
      }));


     new cdk.CfnOutput(this,'GitActionRoleName', {
          value: gitActionRoleName,
          exportName: 'GitActionRoleName', // Can be imported by other stacks
        });
  }
}