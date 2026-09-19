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
 * Standalone stack for the online-oripa scrapers (currently オリくじ and
 * DOPA, both ポケモンカード only). Deliberately separate from BatchStack: it
 * owns no resources the Twitter pipeline depends on, so it can be
 * deployed/destroyed on its own (e.g. DEPLOY_ENV=tmp) without touching the
 * live Twitter batch or web stacks. Every provider writes into the same
 * online-oripa-items table (keyed by a hash of productUrl, tagged with its
 * own `provider`), so the site's listing page shows them together.
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

    // ─── Lambda: オリくじ scraper (Playwright — the site is a client-rendered SPA) ──
    const scraperLogGroup = new logs.LogGroup(this, 'ScraperLogGroup', {
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
      logGroup: scraperLogGroup,
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

    new events.Rule(this, 'ScraperScheduleRule', {
      ruleName: `${deployEnv}-online-oripa-scraper`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(scrapeIntervalMinutes)),
      targets: [new eventsTargets.LambdaFunction(scraperFn)],
    });

    // ─── Lambda: DOPA scraper (server-rendered catalog — plain fetch, no browser) ──
    const dopaScraperLogGroup = new logs.LogGroup(this, 'DopaScraperLogGroup', {
      logGroupName: `/aws/lambda/${deployEnv}-online-oripa-dopa-scraper`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dopaScraperFn = new lambdaNodejs.NodejsFunction(this, 'DopaScraperFunction', {
      functionName: `${deployEnv}-online-oripa-dopa-scraper`,
      entry: path.join(__dirname, '../../../apps/batch/src/online-oripa/index-dopa.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DEPLOY_ENV: deployEnv,
        ONLINE_ORIPA_ITEMS_TABLE_NAME: itemsTable.tableName,
      },
      logGroup: dopaScraperLogGroup,
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: [],
      },
    });

    itemsTable.grantReadWriteData(dopaScraperFn);

    new events.Rule(this, 'DopaScraperScheduleRule', {
      ruleName: `${deployEnv}-online-oripa-dopa-scraper`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(scrapeIntervalMinutes)),
      targets: [new eventsTargets.LambdaFunction(dopaScraperFn)],
    });

    // ─── Outputs ─────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ScraperFunctionName', {
      value: scraperFn.functionName,
      description: 'Lambda function name for the オリくじ scraper',
    });

    new cdk.CfnOutput(this, 'DopaScraperFunctionName', {
      value: dopaScraperFn.functionName,
      description: 'Lambda function name for the DOPA scraper',
    });

    new cdk.CfnOutput(this, 'OnlineOripaItemsTableName', {
      value: itemsTable.tableName,
      description: 'DynamoDB online-oripa-items table name',
    });
  }
}
