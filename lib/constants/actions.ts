export const WILDCARD = '*';
export const SSM_SEND_COMMAND = 'ssm:SendCommand';
// 'iam:PassRole'
export const IAM_PASS_ROLE = 'iam:PassRole';
export const CDK_REPO_ACTIONS = [
    'cloudformation:*',
          's3:*',
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
          'ecr:PutImage',
          'ecr:InitiateLayerUpload',
          'ecr:UploadLayerPart',
          'ecr:CompleteLayerUpload',
          'logs:*',
          'lambda:*',
          'dynamodb:*',
          'apigateway:*',
          'events:*',
          'ssm:*',
          'ec2:Describe*',
          'ec2:CreateSecurityGroup',
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:AuthorizeSecurityGroupEgress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupEgress',
          'ec2:DeleteSecurityGroup',
          'iam:GetRole',
          'iam:PassRole',
]

export const LP_EC2_ROLE_ACTIONS = [
    'ssm:GetParameter',
    'ssm:GetParameters',
    'ssm:GetParametersByPath'
  ]