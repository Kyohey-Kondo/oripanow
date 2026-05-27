import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { Construct } from 'constructs';
import { experimental } from 'aws-cdk-lib/aws-cloudfront';

interface WebStackProps extends cdk.StackProps {
  deployEnv: string;
  domainName?: string;
  certificateArn?: string;
}

export class WebStack extends cdk.Stack {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { deployEnv, domainName, certificateArn } = props;


    // DynamoDB: batch-stack が作成した oripa-posts / giveaway-posts テーブル（読み取り専用）
    const oripaPostsTableName = `${deployEnv}-oripa-posts`;
    const giveawayPostsTableName = `${deployEnv}-giveaway-posts`;

    // CloudFront Function needs literal strings at synth time — read from env, not SSM lookup (which would cache in cdk.context.json).
    const adminPassForCfFn = process.env.ADMIN_PASS ?? '';
    const adminUserForCfFn = process.env.ADMIN_USER ?? '';
    // Lambda env var: resolved by CloudFormation at deploy time, never written to cdk.context.json.
    const adminPassForLambda = ssm.StringParameter.valueForStringParameter(this, '/oripanow/admin/pass');

    // S3: static assets
    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'NextjsLogGroup', {
      logGroupName: `/aws/lambda/${deployEnv}-oripa-now-nextjs`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Web Adapter layer (translates Lambda events → HTTP for Next.js server)
    const lwaLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LwaLayer',
      'arn:aws:lambda:ap-northeast-1:753240598075:layer:LambdaAdapterLayerX86:27',
    );

    // Lambda: Next.js SSR via Lambda Web Adapter + standalone build
    const nextjsFn = new lambda.Function(this, 'NextjsFunction', {
      functionName: `${deployEnv}-oripa-now-nextjs`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'run.sh',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../apps/web/.next/standalone'),
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup,
      layers: [lwaLayer],
      environment: {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_PORT: '3000',
        PORT: '3000',
        ORIPA_POSTS_TABLE_NAME: oripaPostsTableName,
        GIVEAWAY_POSTS_TABLE_NAME: giveawayPostsTableName,
        DEPLOY_ENV: deployEnv,
        NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: 'ca-pub-9551401698199717',
        ADMIN_PASS: adminPassForLambda,
      },
    });

    // IAM: Lambda に DynamoDB 読み取り権限を明示付与（テーブル + 全 GSI）
    const storesTableName = `${deployEnv}-stores`;
    const oripaPostsTableArn = cdk.Stack.of(this).formatArn({
      service: 'dynamodb',
      resource: 'table',
      resourceName: oripaPostsTableName,
    });
    const storesTableArn = cdk.Stack.of(this).formatArn({
      service: 'dynamodb',
      resource: 'table',
      resourceName: storesTableName,
    });
    const giveawayPostsTableArn = cdk.Stack.of(this).formatArn({
      service: 'dynamodb',
      resource: 'table',
      resourceName: giveawayPostsTableName,
    });
    nextjsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'dynamodb:GetItem',
        'dynamodb:BatchGetItem',
        'dynamodb:Scan',
        'dynamodb:Query',
        'dynamodb:DescribeTable',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
      ],
      resources: [
        oripaPostsTableArn, `${oripaPostsTableArn}/index/*`,
        storesTableArn, `${storesTableArn}/index/*`,
        giveawayPostsTableArn, `${giveawayPostsTableArn}/index/*`,
      ],
    }));

    nextjsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter', 'ssm:GetParameters'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/oripa-now/${deployEnv}/staff-*`,
      ],
    }));
    // KMS Decrypt needed for SSM SecureString parameters
    nextjsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['kms:Decrypt'],
      resources: ['*'],
      conditions: {
        StringEquals: { 'kms:ViaService': `ssm.${this.region}.amazonaws.com` },
      },
    }));

    const fnUrl = nextjsFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    // ACM certificate (must be in us-east-1 for CloudFront)
    const certificate =
      certificateArn
        ? acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn)
        : undefined;

    // CloudFront Function: Basic Auth for admin path (viewer request level, before OAC signing)
    const adminPathHash = ssm.StringParameter.valueFromLookup(this, '/oripanow/admin/path-hash');
    const adminAuthFn = new cloudfront.Function(this, 'AdminAuthFunction', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var authHeader = request.headers['authorization'];
  var EXPECTED_USER = ${JSON.stringify(adminUserForCfFn)};
  var EXPECTED_PASS = ${JSON.stringify(adminPassForCfFn)};


  if (authHeader && EXPECTED_USER.length > 0) {
    var decoded = atob(authHeader.value.slice(6));
    var sep = decoded.indexOf(':');
    if (sep > 0 && decoded.slice(0, sep) === EXPECTED_USER && decoded.slice(sep + 1) === EXPECTED_PASS) {
      delete request.headers['authorization'];
      request.headers['x-admin-validated'] = { value: 'true' };
      return request;
    }
  }

  return {
    statusCode: 401,
    statusDescription: 'Unauthorized',
    headers: {
      'www-authenticate': { value: 'Basic realm="Admin"' },
      'content-type': { value: 'text/plain' }
    },
    body: 'Unauthorized'
  };
}
      `),
    });

    // CloudFront: custom cache policy for SSR pages (24h TTL, keyed on area + page)
    const ssrCachePolicy = new cloudfront.CachePolicy(this, 'SsrCachePolicy', {
      cachePolicyName: `${deployEnv}-ssr-cache`,
      defaultTtl: cdk.Duration.hours(24),
      minTtl: cdk.Duration.hours(24),
      maxTtl: cdk.Duration.hours(24),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList('area', 'region', 'page', 'sort', 'filter'),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('RSC', 'Next-Router-State-Tree', 'Next-Router-Prefetch'),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Lambda@Edge: Origin Request — computes x-amz-content-sha256 for POST/PUT bodies.
    // Required because CloudFront OAC + Lambda Function URL (AWS_IAM) uses SigV4 signing
    // and Lambda does not support unsigned payloads.
    const payloadHashFn = new experimental.EdgeFunction(this, 'PayloadHashFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/payload-hash')),
      timeout: cdk.Duration.seconds(5),
    });

    // CloudFront: CDN + HTTPS
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      ...(certificate && domainName ? { domainNames: [domainName], certificate } : {}),
      defaultBehavior: {
        origin: origins.FunctionUrlOrigin.withOriginAccessControl(fnUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: ssrCachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      additionalBehaviors: {
        // Admin page: Basic Auth via CloudFront Function, no caching, POST allowed for Server Actions.
        // Lambda@Edge (origin request) adds x-amz-content-sha256 so OAC SigV4 signing works for POST.
        [`/${adminPathHash}`]: {
          origin: origins.FunctionUrlOrigin.withOriginAccessControl(fnUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [{
            function: adminAuthFn,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
          edgeLambdas: [{
            functionVersion: payloadHashFn.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            includeBody: true,
          }],
        },
        [`/${adminPathHash}/*`]: {
          origin: origins.FunctionUrlOrigin.withOriginAccessControl(fnUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [{
            function: adminAuthFn,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
          edgeLambdas: [{
            functionVersion: payloadHashFn.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            includeBody: true,
          }],
        },
        '/_next/static/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // Upload static assets to S3
    new s3deploy.BucketDeployment(this, 'StaticAssets', {
      sources: [
        s3deploy.Source.asset(
          path.join(__dirname, '../../../apps/web/.next/static'),
        ),
      ],
      destinationBucket: assetBucket,
      destinationKeyPrefix: '_next/static',
      distribution: this.distribution,
      distributionPaths: ['/_next/static/*'],
    });

    // CloudFront OAC requires both InvokeFunctionUrl and InvokeFunction permissions
    nextjsFn.addPermission('AllowCloudFrontInvokeFunction', {
      principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain',
    });

    new cdk.CfnOutput(this, 'AssetBucketName', {
      value: assetBucket.bucketName,
      description: 'S3 bucket for static assets',
    });
  }
}
