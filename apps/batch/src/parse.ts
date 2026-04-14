import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Tool,
  type ToolResultBlock,
} from '@aws-sdk/client-bedrock-runtime';
import type { TweetItem } from '@oripa-now/db';

export type OripaItem = {
  price?: number;
  stockCount?: number;
};

export type AnalysisResult = {
  status: 'on_sale' | 'upcoming' | 'sold_out' | 'not_oripa';
  saleAt?: string; // YYYY-MM-DD JST
  items: OripaItem[]; // one entry per distinct price tier; empty for not_oripa
};

const MODEL = process.env.ANTHROPIC_MODEL ?? 'jp.anthropic.claude-haiku-4-5-20251001-v1:0';

const TOOL: Tool = {
  toolSpec: {
    name: 'classify_oripa_tweet',
    description: 'Classify a tweet about a Pokémon card oripa sale and extract structured information.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['on_sale', 'upcoming', 'sold_out', 'not_oripa'],
            description:
              'on_sale: currently selling now. upcoming: announced for a future date. sold_out: was selling but now sold out. not_oripa: not about a Pokémon card oripa sale.',
          },
          saleAt: {
            type: 'string',
            description:
              "Sale date in YYYY-MM-DD format (JST). For on_sale/sold_out use today's date. For upcoming without specific date use tomorrow's date. Omit for not_oripa.",
          },
          items: {
            type: 'array',
            description:
              'One entry per distinct price tier or product mentioned in the tweet. Use an empty array for not_oripa.',
            items: {
              type: 'object',
              properties: {
                price: {
                  type: 'integer',
                  description: 'Price in JPY for this tier. Omit if not mentioned.',
                },
                stockCount: {
                  type: 'integer',
                  description: 'Number of packs available for this tier. Omit if not mentioned.',
                },
              },
            },
          },
        },
        required: ['status', 'items'],
      },
    },
  },
};

/**
 * Analyze a tweet using Claude via Bedrock Converse API.
 * Uses tool_use to enforce a fixed JSON schema — no fragile parsing needed.
 * Authentication is handled by IAM — no API key required.
 */
export async function analyzeTweet(
  client: BedrockRuntimeClient,
  tweet: TweetItem,
  todayJST: string,
): Promise<AnalysisResult> {
  const response = await client.send(
    new ConverseCommand({
      modelId: MODEL,
      toolConfig: {
        tools: [TOOL],
        toolChoice: { any: {} },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              text: `Today's date (JST): ${todayJST}

Analyze this tweet from a Japanese trading card shop and classify it using the provided tool.
Focus on Pokémon card oripa (original pack) sales only.

Tweet:
${tweet.content}`,
            },
          ],
        },
      ],
    }),
  );

  const toolUse = response.output?.message?.content?.find(
    (b): b is Exclude<typeof b, ToolResultBlock> => b.toolUse !== undefined,
  );

  if (!toolUse?.toolUse?.input) {
    throw new Error(`Bedrock returned no toolUse block. Stop reason: ${response.stopReason}`);
  }

  return toolUse.toolUse.input as AnalysisResult;
}

export { BedrockRuntimeClient };
