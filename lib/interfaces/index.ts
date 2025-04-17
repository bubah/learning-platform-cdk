import * as cdk from 'aws-cdk-lib';

export interface LpStackProps extends cdk.StackProps {
    environment: string; // Environment name (e.g., dev, prod)
    accountId?: string; // AWS Account ID
    whiteListedIps?: string[]; // Optional: List of IPs to whitelist for RDS access
    region?: string; // AWS Region
}
export interface IEnvConfig {
    [key: string]: LpStackProps;
}