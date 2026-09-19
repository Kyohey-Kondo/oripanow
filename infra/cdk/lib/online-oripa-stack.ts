import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';

interface OnlineOripaStackProps extends cdk.StackProps {
  deployEnv: string;
  scrapeIntervalMinutes?: number;
}

/**
 * Standalone stack for the online-oripa scraper (オリくじ ポケモンカード).
 * Deliberately separate from BatchStack: it owns no resources the Twitter
 * pipeline depends on, so it can be deployed/destroyed on its own (e.g.
 * DEPLOY_ENV=tmp) without touching the live Twitter batch or web stacks.
 */
export class OnlineOripaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OnlineOripaStackProps) {
    super(scope, id, props);

    const { deployEnv, scrapeIntervalMinutes = 10 } = props;

    // ─── DynamoDB: online-oripa-items ────────────────────────────────────────
    // PK: itemId (sha1 of productUrl)
    // GSI1: activeStatus → lastSeenAt (sparse — only status="active" items appear)
    const itemsTable = new dynamodb.Table(this, 'OnlineOripaItemsTable', {
      tableName: `${deployEnv}-online-oripa-items`,
      partitionKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    itemsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'activeStatus', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastSeenAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ─── Lambda: scraper ──────────────────────────────────────────────────────
    const logGroup = new logs.LogGroup(this, 'ScraperLogGroup', {
      logGroupName: `/aws/lambda/${deployEnv}-online-oripa-scraper`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const scraperFn = new lambdaNodejs.NodejsFunction(this, 'ScraperFunction', {
      functionName: `${deployEnv}-online-oripa-scraper`,
      entry: path.join(__dirname, '../../../apps/batch/src/online-oripa/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 2048,
      timeout: cdk.Duration.minutes(5),
      environment: {
        DEPLOY_ENV: deployEnv,
        ONLINE_ORIPA_ITEMS_TABLE_NAME: itemsTable.tableName,
      },
      logGroup,
      bundling: {
        minify: true,
        sourceMap: false,
        // Chromium/Playwright ship native binaries — must stay real npm packages
        // in the deployment bundle rather than esbuild-inlined.
        nodeModules: ['@sparticuz/chromium', 'playwright-core'],
        externalModules: [],
      },
    });

    itemsTable.grantReadWriteData(scraperFn);

    // ─── EventBridge: periodic scrape ────────────────────────────────────────
    new events.Rule(this, 'ScraperScheduleRule', {
      ruleName: `${deployEnv}-online-oripa-scraper`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(scrapeIntervalMinutes)),
      targets: [new eventsTargets.LambdaFunction(scraperFn)],
    });

    // ─── Outputs ─────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ScraperFunctionName', {
      value: scraperFn.functionName,
      description: 'Lambda function name for the online-oripa scraper',
    });

    new cdk.CfnOutput(this, 'OnlineOripaItemsTableName', {
      value: itemsTable.tableName,
      description: 'DynamoDB online-oripa-items table name',
    });
  }
}
