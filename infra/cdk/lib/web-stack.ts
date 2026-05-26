import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';

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
      ],
      resources: [
        oripaPostsTableArn, `${oripaPostsTableArn}/index/*`,
        storesTableArn, `${storesTableArn}/index/*`,
        giveawayPostsTableArn, `${giveawayPostsTableArn}/index/*`,
      ],
    }));

    const fnUrl = nextjsFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    // ACM certificate (must be in us-east-1 for CloudFront)
    const certificate =
      certificateArn
        ? acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn)
        : undefined;

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
