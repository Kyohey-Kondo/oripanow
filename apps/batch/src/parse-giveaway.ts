import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Tool,
  type ToolResultBlock,
} from '@aws-sdk/client-bedrock-runtime';
import type { GiveawayTweetItem } from '@oripa-now/db';
import type { GiveawayPrize, EntryConditions } from '@oripa-now/types';

export type GiveawayAnalysisResult = {
  status: 'active' | 'ended' | 'upcoming' | 'not_giveaway';
  prizes: GiveawayPrize[];
  entryConditions?: EntryConditions;
  deadline?: string; // YYYY-MM-DD
};

const MODEL = process.env.ANTHROPIC_MODEL ?? 'jp.anthropic.claude-haiku-4-5-20251001-v1:0';

const TOOL: Tool = {
  toolSpec: {
    name: 'classify_giveaway_tweet',
    description: 'Classify a Japanese tweet for a Pokémon card giveaway campaign and extract structured information.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'ended', 'upcoming', 'not_giveaway'],
            description:
              'active: giveaway is currently accepting entries. ' +
              'ended: deadline has already passed or winner was announced. ' +
              'upcoming: announced but entry period has not started. ' +
              'not_giveaway: tweet is not about a Pokémon card giveaway/プレゼント企画.',
          },
          prizes: {
            type: 'array',
            description:
              'List of prizes being given away. Use an empty array only for not_giveaway.',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['box', 'single', 'other'],
                  description:
                    'box: sealed booster box (BOX, カートン, 1BOX). ' +
                    'single: individual card (SAR, SR, RR, ex, specific card name). ' +
                    'other: store credit, pack, accessories, etc.',
                },
                name: {
                  type: 'string',
                  description:
                    'Product or card name as stated in the tweet (e.g. "拡張パック バトルパートナーズ BOX", "ピカチュウex SAR").',
                },
                count: {
                  type: 'integer',
                  description: 'Number of winners for this prize if explicitly stated. Omit if not mentioned.',
                },
              },
              required: ['type', 'name'],
            },
          },
          entryConditions: {
            type: 'object',
            description:
              'Structured entry conditions for this giveaway. ' +
              'Set each boolean to true only if that action is explicitly required. ' +
              'Omit for not_giveaway.',
            properties: {
              follow: {
                type: 'boolean',
                description: 'Must follow the account (フォロー必須).',
              },
              repost: {
                type: 'boolean',
                description: 'Must repost or RT (リポスト/RT必須).',
              },
              reply: {
                type: 'boolean',
                description: 'Must reply or quote-tweet (リプライ/引用RT必須).',
              },
              other: {
                type: 'boolean',
                description: 'Any other required action (いいね、ハッシュタグ、複数アカウントフォロー等).',
              },
              note: {
                type: 'string',
                description:
                  'Supplementary detail in Japanese for non-obvious conditions, e.g. required hashtag, reply prompt, or multi-account follow. Omit if not needed.',
              },
            },
            required: ['follow', 'repost', 'reply', 'other'],
          },
          deadline: {
            type: 'string',
            description:
              'Deadline date in YYYY-MM-DD format (JST). ' +
              'Omit if no explicit date deadline is mentioned in the tweet.',
          },
        },
        required: ['status', 'prizes'],
      },
    },
  },
};

/**
 * Analyze a giveaway tweet using Claude via Bedrock Converse API.
 * Uses tool_use to enforce a fixed JSON schema.
 * Authentication is handled by IAM — no API key required.
 */
export async function analyzeGiveawayTweet(
  client: BedrockRuntimeClient,
  tweet: GiveawayTweetItem,
  todayJST: string,
): Promise<GiveawayAnalysisResult> {
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

Analyze this Japanese tweet for a Pokémon card giveaway campaign (プレゼント企画/懸賞).
Extract prize details, structured entry conditions (follow/repost/reply/other booleans), and deadline using the provided tool.
Set each entryConditions boolean to true only if that action is explicitly required to enter.
not_giveaway: tweet is not about a Pokémon card giveaway (e.g. normal sale, news, restock).

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

  return toolUse.toolUse.input as unknown as GiveawayAnalysisResult;
}

export { BedrockRuntimeClient };
