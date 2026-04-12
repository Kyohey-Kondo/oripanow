import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'oripa-now';

interface HealthCheckResponse {
  statusCode: 200;
  body: HealthCheckBody;
}

type HealthCheckBody =
  | {
      status: 'healthy';
      timestamp: string;
      db: 'connected';
      dbLatencyMs: number;
    }
  | {
      status: 'healthy';
      timestamp: string;
      db: 'error';
      dbError: string;
    };

export const handler = async (_event: unknown): Promise<HealthCheckResponse> => {
  const timestamp = new Date().toISOString();

  const start = Date.now();
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    const dbLatencyMs = Date.now() - start;

    return {
      statusCode: 200,
      body: {
        status: 'healthy',
        timestamp,
        db: 'connected',
        dbLatencyMs,
      },
    };
  } catch (err) {
    const dbError = err instanceof Error ? err.message : String(err);

    return {
      statusCode: 200,
      body: {
        status: 'healthy',
        timestamp,
        db: 'error',
        dbError,
      },
    };
  }
};
