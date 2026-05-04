import axios from 'axios';

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export type AiReviewInput = {
  opening: string;
  accuracyWhite: number;
  accuracyBlack: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  criticalPositions: Array<{
    moveNumber: number;
    classification?: string;
    evalBefore?: number;
    evalAfter?: number;
    bestMove?: string;
    san?: string;
    side?: string;
  }>;
};

export type AiReviewResult = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  turningPoints: string[];
  improvementSuggestions: string[];
  coachMessage?: string;
};

export type MoveExplanationInput = {
  move: string;
  evalBefore: number;
  evalAfter: number;
  bestMove: string;
  classification: string;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'mistralai/mistral-7b-instruct',
  'meta-llama/llama-3-8b-instruct',
];

function getModelCandidates(preferred?: string): string[] {
  const fromEnv = process.env.OPENROUTER_MODELS;
  if (fromEnv && typeof fromEnv === 'string') {
    const envModels = fromEnv
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (envModels.length > 0) {
      return envModels;
    }
  }

  if (preferred) {
    return [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];
  }

  return FALLBACK_MODELS;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }
  return key;
}

function extractJson(content: string): AiReviewResult | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonText = content.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonText) as AiReviewResult;
    if (!parsed || typeof parsed.summary !== 'string') return null;
    return {
      summary: parsed.summary,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      turningPoints: Array.isArray(parsed.turningPoints) ? parsed.turningPoints : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
      coachMessage: typeof parsed.coachMessage === 'string' ? parsed.coachMessage : undefined,
    };
  } catch {
    return null;
  }
}

async function callOpenRouter(messages: OpenRouterMessage[], model = DEFAULT_MODEL): Promise<string> {
  const models = getModelCandidates(model);
  let lastError: unknown = null;

  for (const candidate of models) {
    try {
      const response = await axios.post<OpenRouterResponse>(
        OPENROUTER_URL,
        {
          model: candidate,
          messages,
          temperature: 0.4,
        },
        {
          headers: {
            Authorization: `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('OpenRouter response missing content');
      }
      return content;
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      lastError = err;
      if (status === 402 || status === 429 || status === 403 || status === 404) {
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`OpenRouter request failed for all models. Last error: ${lastError.message}`);
  }
  throw new Error('OpenRouter request failed for all models');
}

export async function getAIReview(data: AiReviewInput, model = DEFAULT_MODEL): Promise<AiReviewResult> {
  const prompt = `Return JSON only. Do not include markdown or extra text.\n\nSchema:\n{\n  "coachMessage": string,\n  "summary": string,\n  "strengths": string[],\n  "weaknesses": string[],\n  "turningPoints": string[],\n  "improvementSuggestions": string[]\n}\n\nGame Data:\n${JSON.stringify(data, null, 2)}`;

  const content = await callOpenRouter(
    [
      { role: 'system', content: 'You are a professional chess coach who explains engine results clearly.' },
      { role: 'user', content: prompt },
    ],
    model
  );

  const parsed = extractJson(content);
  if (parsed) return parsed;

  return {
    summary: content.trim(),
    strengths: [],
    weaknesses: [],
    turningPoints: [],
    improvementSuggestions: [],
  };
}

export async function getMoveExplanation(data: MoveExplanationInput, model = DEFAULT_MODEL): Promise<string> {
  const prompt = `Explain this chess move in simple terms.\n\nMove: ${data.move}\nEval Before: ${data.evalBefore}\nEval After: ${data.evalAfter}\nBest Move: ${data.bestMove}\nClassification: ${data.classification}\n\nExplain:\n- Why it is good or bad\n- What was missed\n- The idea behind the best move\n\nKeep it to 2-4 sentences.`;

  const content = await callOpenRouter(
    [
      { role: 'system', content: 'You are a chess coach. Be concise and practical.' },
      { role: 'user', content: prompt },
    ],
    model
  );

  return content.trim();
}
