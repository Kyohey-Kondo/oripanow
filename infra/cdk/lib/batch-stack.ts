import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';

interface BatchStackProps extends cdk.StackProps {
  deployEnv: string;
}

export class BatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BatchStackProps) {
    super(scope, id, props);

    const { deployEnv } = props;

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
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
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

    // ─── Lambda: batch processing ────────────────────────────────────────────
    const batchFn = new lambdaNodejs.NodejsFunction(this, 'BatchFunction', {
      functionName: `${deployEnv}-oripa-now-batch`,
      entry: path.join(__dirname, '../../../apps/batch/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DEPLOY_ENV: deployEnv,
        STORES_TABLE_NAME: storesTable.tableName,
        ORIPA_POSTS_TABLE_NAME: oripaPostsTable.tableName,
        TWEETS_TABLE_NAME: tweetsTable.tableName,
      },
      logGroup,
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: [],
      },
    });

    storesTable.grantReadWriteData(batchFn);
    oripaPostsTable.grantReadWriteData(batchFn);
    tweetsTable.grantReadWriteData(batchFn);

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
