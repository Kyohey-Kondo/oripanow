import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';

export class BatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB: Single Table "oripa-now" with GSI × 3
    const table = new dynamodb.Table(this, 'OripaTable', {
      tableName: 'oripa-now',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI1: エリア別・ステータス別
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: 店舗別
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: 未処理ツイート (sparse)
    table.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'BatchLogGroup', {
      logGroupName: '/aws/lambda/oripa-now-batch',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda: バッチ処理（現フェーズはヘルスチェック + DynamoDB 接続確認のスタブ）
    const batchFn = new lambdaNodejs.NodejsFunction(this, 'BatchFunction', {
      functionName: 'oripa-now-batch',
      entry: path.join(__dirname, '../../../apps/batch/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
      },
      logGroup,
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: [],
      },
    });

    // IAM: Lambda に DynamoDB 操作権限を付与
    table.grantReadWriteData(batchFn);

    // Outputs
    new cdk.CfnOutput(this, 'BatchFunctionName', {
      value: batchFn.functionName,
      description: 'Lambda function name for batch processing',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: table.tableName,
      description: 'DynamoDB table name',
    });
  }
}
