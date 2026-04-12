import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3: 静的アセット
    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'NextjsLogGroup', {
      logGroupName: '/aws/lambda/oripa-now-nextjs',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda: Next.js SSR スタブ（インライン実装）
    const nextjsFn = new lambda.Function(this, 'NextjsFunction', {
      functionName: 'oripa-now-nextjs',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: JSON.stringify({ status: "ok" }) });',
      ),
      timeout: cdk.Duration.seconds(30),
      logGroup,
    });

    const fnUrl = nextjsFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // CloudFront: CDN + HTTPS
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(fnUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
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
