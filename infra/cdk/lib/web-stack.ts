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
}

export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { deployEnv } = props;

    // DynamoDB: batch-stack が作成した oripa-posts テーブル（読み取り専用）
    const oripaPostsTableName = `${deployEnv}-oripa-posts`;

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
      ],
    }));

    const fnUrl = nextjsFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // CloudFront: CDN + HTTPS
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(fnUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
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
      distribution,
      distributionPaths: ['/_next/static/*'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain',
    });

    new cdk.CfnOutput(this, 'AssetBucketName', {
      value: assetBucket.bucketName,
      description: 'S3 bucket for static assets',
    });
  }
}
