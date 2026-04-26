import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { Construct } from 'constructs';

interface BatchStackProps extends cdk.StackProps {
  deployEnv: string;
  cloudFrontDistributionId?: string;
}

export class BatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BatchStackProps) {
    super(scope, id, props);

    const { deployEnv, cloudFrontDistributionId } = props;

    // ─── DynamoDB: stores ────────────────────────────────────────────────────
    // PK: storeId (ULID)
    const storesTable = new dynamodb.Table(this, 'StoresTable', {
      tableName: `${deployEnv}-stores`,
      partitionKey: { name: 'storeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─── DynamoDB: oripa-posts ───────────────────────────────────────────────
    // PK: postId (ULID)
    // GSI1: areaStatusDate → createdAt  (top/area page: today's on-sale posts)
    // GSI2: storeId → createdAt         (store detail page: posts by store)
    const oripaPostsTable = new dynamodb.Table(this, 'OripaPostsTable', {
      tableName: `${deployEnv}-oripa-posts`,
      partitionKey: { name: 'postId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    oripaPostsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'areaStatusDate', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    oripaPostsTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'storeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ─── DynamoDB: tweets ────────────────────────────────────────────────────
    // PK: id (ULID, internal)
    // GSI1: storeId → tweetedAt         (tweets per store, chronological)
    // GSI2: processStatus → fetchedAt   (sparse: unprocessed batch queue)
    const tweetsTable = new dynamodb.Table(this, 'TweetsTable', {
      tableName: `${deployEnv}-tweets`,
      partitionKey: { name: 'tweetId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    tweetsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'storeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'tweetedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    tweetsTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'processStatus', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'fetchedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ─── CloudWatch Log Group ────────────────────────────────────────────────
    const logGroup = new logs.LogGroup(this, 'BatchLogGroup', {
      logGroupName: `/aws/lambda/${deployEnv}-oripa-now-batch`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─── SSM: secrets ────────────────────────────────────────────────────────
    const twitterBearerToken = ssm.StringParameter.valueForStringParameter(
      this,
      `/oripa-now/${deployEnv}/TWITTER_BEARER_TOKEN`,
    );

    // ─── Lambda: batch processing ────────────────────────────────────────────
    const batchFn = new lambdaNodejs.NodejsFunction(this, 'BatchFunction', {
      functionName: `${deployEnv}-oripa-now-batch`,
      entry: path.join(__dirname, '../../../apps/batch/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.minutes(5),
      environment: {
        DEPLOY_ENV: deployEnv,
        STORES_TABLE_NAME: storesTable.tableName,
        ORIPA_POSTS_TABLE_NAME: oripaPostsTable.tableName,
        TWEETS_TABLE_NAME: tweetsTable.tableName,
        TWITTER_BEARER_TOKEN: twitterBearerToken,
        TWEET_KEYWORDS: 'オリパ,おりぱ,oripa,ORIPA,オリジナルパック,mystery pack,mystery box,custom pack,blind pack,gacha pack',
        GAME_KEYWORDS: 'ポケカ,ポケモンカード,ポケモン,Pokemon,Pokémon,PTCG,PKM',
      },
      logGroup,
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: [],
      },
    });

    // ─── EventBridge: daily schedule (09:00 JST = 00:00 UTC) ─────────────────
    new events.Rule(this, 'BatchScheduleRule', {
      ruleName: `${deployEnv}-oripa-now-batch-fetch`,
      schedule: events.Schedule.cron({ hour: '0', minute: '0' }),
      targets: [new eventsTargets.LambdaFunction(batchFn)],
    });

    storesTable.grantReadWriteData(batchFn);
    oripaPostsTable.grantReadWriteData(batchFn);
    tweetsTable.grantReadWriteData(batchFn);

    // ─── Lambda: analyze ─────────────────────────────────────────────────────
    const analyzeFn = new lambdaNodejs.NodejsFunction(this, 'AnalyzeFunction', {
      functionName: `${deployEnv}-oripa-now-analyze`,
      entry: path.join(__dirname, '../../../apps/batch/src/analyze.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.minutes(5),
      environment: {
        DEPLOY_ENV: deployEnv,
        STORES_TABLE_NAME: storesTable.tableName,
        ORIPA_POSTS_TABLE_NAME: oripaPostsTable.tableName,
        TWEETS_TABLE_NAME: tweetsTable.tableName,
        ANTHROPIC_MODEL: 'jp.anthropic.claude-haiku-4-5-20251001-v1:0',
        ANALYZE_BATCH_SIZE: '50',
        ...(cloudFrontDistributionId ? { CLOUDFRONT_DISTRIBUTION_ID: cloudFrontDistributionId } : {}),
      },
      logGroup: new logs.LogGroup(this, 'AnalyzeLogGroup', {
        logGroupName: `/aws/lambda/${deployEnv}-oripa-now-analyze`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: [],
      },
    });

    storesTable.grantReadData(analyzeFn);
    oripaPostsTable.grantReadWriteData(analyzeFn);
    tweetsTable.grantReadWriteData(analyzeFn);

    // CloudFront: IAM permission to create invalidations (only when distribution ID is provided)
    if (cloudFrontDistributionId) {
      analyzeFn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['cloudfront:CreateInvalidation'],
          resources: [
            `arn:aws:cloudfront::${this.account}:distribution/${cloudFrontDistributionId}`,
          ],
        }),
      );
    }

    // Bedrock: IAM permission to invoke Claude models
    analyzeFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          'arn:aws:bedrock:*::foundation-model/anthropic.*',
          `arn:aws:bedrock:*:${this.account}:inference-profile/*`,
        ],
      }),
    );

    new events.Rule(this, 'AnalyzeScheduleRule', {
      ruleName: `${deployEnv}-oripa-now-analyze`,
      schedule: events.Schedule.cron({ hour: '0', minute: '10' }),
      targets: [new eventsTargets.LambdaFunction(analyzeFn)],
    });

    // ─── Outputs ─────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'BatchFunctionName', {
      value: batchFn.functionName,
      description: 'Lambda function name for batch processing',
    });

    new cdk.CfnOutput(this, 'StoresTableName', {
      value: storesTable.tableName,
      description: 'DynamoDB stores table name',
    });

    new cdk.CfnOutput(this, 'OripaPostsTableName', {
      value: oripaPostsTable.tableName,
      description: 'DynamoDB oripa-posts table name',
    });

    new cdk.CfnOutput(this, 'TweetsTableName', {
      value: tweetsTable.tableName,
      description: 'DynamoDB tweets table name',
    });
  }
}
