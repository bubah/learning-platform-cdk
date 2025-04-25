import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  BRANCH,
  CDK_REPO_ACTIONS,
  // EC2_INSTANCE_ID,
  GIT_ACTION_ROLE_NAME,
  GITHUB_OIDC_TOKEN_URL,
  LP_CDK_REPO,
  LP_SERVICE_REPO,
  SSM_SEND_COMMAND,
  STS_SERVICE,
  WILDCARD,
  SSM_GET_COMMAND_INVOC,
  SSM_LIST_COMMAND_INVOC,
} from './constants';
import { LpStackProps } from './interfaces';

export class ContinousDeplymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: LpStackProps) {
    super(scope, id, props);

    const lpServiceRepo = LP_SERVICE_REPO;
    const lpCdkRepo = LP_CDK_REPO;
    const branch = BRANCH.master;

    const gitActionLpRoleName = `${id}-role-git-action-${props?.environment}-${props?.accountId}`;
    const gitActionCdkPipelineRoleName = `${id}-role-git-action-cdk-pipeline-${props?.environment}-${props?.accountId}`;

    // const ec2InstanceId = cdk.Fn.importValue(EC2_INSTANCE_ID);

    // 1. Create OIDC provider for GitHub
    const oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOIDCProvider', {
      url: GITHUB_OIDC_TOKEN_URL,
      clientIds: [STS_SERVICE],
    });

    const lpSvcRepoGitActionRole = new iam.Role(this, gitActionLpRoleName, {
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': STS_SERVICE,
          'token.actions.githubusercontent.com:sub': `repo:${lpServiceRepo}:ref:refs/heads/${branch}`,
        },
      }),
      roleName: gitActionLpRoleName,
    });

    const cdkRepoGitActionRole = new iam.Role(this, gitActionCdkPipelineRoleName, {
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': STS_SERVICE,
          'token.actions.githubusercontent.com:sub': `repo:${lpCdkRepo}:ref:refs/heads/${branch}`,
        },
      }),
      roleName: gitActionCdkPipelineRoleName,
    });

    lpSvcRepoGitActionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [SSM_SEND_COMMAND, SSM_GET_COMMAND_INVOC, SSM_LIST_COMMAND_INVOC],
        resources: ['*'],
      })
    );
    // lpSvcRepoGitActionRole.addToPolicy(
    //   new iam.PolicyStatement({
    //     actions: [SSM_SEND_COMMAND],
    //     resources: [
    //       `arn:aws:ec2:${this.region}:${this.account}:instance/${ec2InstanceId}`, // Your EC2 instance
    //       `arn:aws:ssm:${this.region}:${this.account}:document/AWS-RunShellScript`,
    //       `arn:aws:ssm:${this.region}:${this.account}:*`,
    //     ],
    //   })
    // );

    cdkRepoGitActionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: CDK_REPO_ACTIONS,
        resources: [WILDCARD],
      })
    );

    new cdk.CfnOutput(this, 'GitActionRoleName', {
      value: gitActionLpRoleName,
      exportName: GIT_ACTION_ROLE_NAME, // Can be imported by other stacks
    });
  }
}
