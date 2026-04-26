#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import * as cdk from 'aws-cdk-lib';
import { BatchStack } from '../lib/batch-stack';
import { WebStack } from '../lib/web-stack';

const deployEnv = process.env.DEPLOY_ENV ?? 'dev';

const app = new cdk.App();

const webStack = new WebStack(app, `${deployEnv}-web-stack`, {
  deployEnv,
  domainName: process.env.DOMAIN_NAME,
  certificateArn: process.env.CERTIFICATE_ARN,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});

new BatchStack(app, `${deployEnv}-batch-stack`, {
  deployEnv,
  cloudFrontDistributionId: webStack.distribution.distributionId,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});
