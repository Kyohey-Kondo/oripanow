#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BatchStack } from '../lib/batch-stack';
import { WebStack } from '../lib/web-stack';

const app = new cdk.App();

new BatchStack(app, 'batch-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});

new WebStack(app, 'web-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});
