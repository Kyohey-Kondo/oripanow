#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BatchStack } from '../lib/batch-stack';
import { WebStack } from '../lib/web-stack';

const deployEnv = process.env.DEPLOY_ENV ?? 'dev';

const app = new cdk.App();

new BatchStack(app, `${deployEnv}-batch-stack`, {
  deployEnv,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});

new WebStack(app, `${deployEnv}-web-stack`, {
  deployEnv,
  domainName: process.env.DOMAIN_NAME,
  certificateArn: process.env.CERTIFICATE_ARN,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});
