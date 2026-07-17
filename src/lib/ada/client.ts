/**
 * src/lib/ada/client.ts — MiniMax M3 LLM client wrapper.
 *
 * Wraps the OpenAI-compatible chat completions API. Used by `/api/ada`
 * for intent classification and answer generation.
 *
 * Endpoint shape (verified 2026-07-15 22:58 UTC):
 *   POST {MINIMAX_BASE_URL}/chat/completions
 *   Authorization: Bearer ${MINIMAX_API_KEY}
 *   { model, messages, max_tokens, temperature, ... }
 *
 * Model `MiniMax-M3` confirmed available (verified via /models probe).
 * Other models available: MiniMax-M2, M2.1, M2.5, M2.7 (plus highspeed variants).
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface ChatResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  ms: number;
}

function env(name: string, fallback?: string): string | undefined {
  const v = (import.meta.env?.[name] ?? process.env[name]) as string | undefined;
  return v ?? fallback;
}

export async function adaChat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const apiKey = env('MINIMAX_API_KEY');
  const baseUrl: string = env('MINIMAX_BASE_URL') ?? 'https://api.minimax.io/v1';
  const model: string = opts.model ?? env('MINIMAX_MODEL') ?? 'MiniMax-M3';
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is not set — configure it via hPanel env or .env');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const t0 = Date.now();

  const res = await fetch(url, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 800,
      messages,
      // Don't stream for now; response shape is simpler.
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MiniMax ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json() as {
    id?: string;
    model?: string;
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  };

  const text = json.choices?.[0]?.message?.content ?? '';
  // MiniMax sometimes emits a  详细思考...  trace before the answer; strip if present.
  // The user-facing answer is the last paragraph after a blank line.
  const stripped = stripReasoning(text).trim();

  return {
    content: stripped,
    model: json.model ?? 'MiniMax-M3',
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
    reasoningTokens: json.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    totalTokens: json.usage?.total_tokens ?? 0,
    ms: Date.now() - t0,
  };
}

function stripReasoning(s: string): string {
  // Strip chain-of-thought blocks MiniMax likes to emit.
  let out = s;
  // 1) <details>...</details> HTML block
  const detailsMatch = out.match(/<details[^>]*>[\s\S]*?<\/details>/i);
  if (detailsMatch && detailsMatch.index !== undefined && detailsMatch.index < 60) {
    out = out.slice(detailsMatch.index + detailsMatch[0]!.length).trimStart();
  }
  // 2) Fenced Markdown blocks (``` or 详细思考) early in the response
  const fenceMatch = out.match(/^(?:```[\s\S]*?```|\u8be6\u7ec6\u601d\u8003[\s\S]*?\n\n)/);
  if (fenceMatch && fenceMatch.index !== undefined && fenceMatch.index < 40) {
    out = out.slice(fenceMatch.index + fenceMatch[0]!.length).trimStart();
  }
  // 3) "lead-in paragraph" before a blank line that contains thinking-marker words
  const fence = out.indexOf('\n\n');
  if (fence > 0 && fence < 600 && /细节|思考|reasoning|thinking|Thought|详细/i.test(out.slice(0, fence))) {
    out = out.slice(fence + 2);
  }
  // 4) Strip any remaining leading/trailing artifact whitespace
  return out.trim();
}
