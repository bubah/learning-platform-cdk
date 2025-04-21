import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { LpStackProps } from './interfaces';
import { CDK_REPO_ACTIONS, EC2_INSTANCE_ID, SSM_SEND_COMMAND, WILDCARD } from './constants';

export class ContinousDeplymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: LpStackProps) {
    super(scope, id, props);

    const lpServiceRepo = "bubah/learning-platform";
    const lpCdkRepo = "bubah/learning-platform-cdk";
    const branch = "master";

    const gitActionLpRoleName = `${id}-role-git-action-${props?.environment}-${props?.accountId}`;
    const gitActionCdkPipelineRoleName = `${id}-role-git-action-cdk-pipeline-${props?.environment}-${props?.accountId}`;

    const ec2InstanceId = cdk.Fn.importValue(EC2_INSTANCE_ID);

    const lpSvcRepoGitActionRole = new iam.Role(this, gitActionLpRoleName, {
      assumedBy: new iam.WebIdentityPrincipal(
        `arn:aws:iam::${cdk.Stack.of(this).account}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            [`token.actions.githubusercontent.com:sub`]: `repo:${lpServiceRepo}:ref:refs/heads/${branch}`,
          },
        }
      ),
      roleName: gitActionLpRoleName,
    });

    const cdkRepoGitActionRole = new iam.Role(this, gitActionCdkPipelineRoleName, {
      assumedBy: new iam.WebIdentityPrincipal(
        `arn:aws:iam::${cdk.Stack.of(this).account}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            [`token.actions.githubusercontent.com:sub`]: `repo:${lpCdkRepo}:ref:refs/heads/${branch}`,
          },
        }
      ),
      roleName: gitActionCdkPipelineRoleName,
    });

    lpSvcRepoGitActionRole.addToPolicy(new iam.PolicyStatement({
        actions: [SSM_SEND_COMMAND],
        resources: [
          `arn:aws:ec2:${this.region}:${this.account}:instance/${ec2InstanceId}`, // Your EC2 instance
          `arn:aws:ssm:${this.region}:${this.account}:document/AWS-RunShellScript`
        ]
    }));

    cdkRepoGitActionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: CDK_REPO_ACTIONS,
        resources: [WILDCARD],
      })
    );
  
     new cdk.CfnOutput(this,'GitActionRoleName', {
          value: gitActionLpRoleName,
          exportName: 'GitActionRoleName', // Can be imported by other stacks
      });
  }
}