/* Lightweight LLM proxy wrapper for the client.
   Supports multiple AI providers: OpenAI, Groq (free), and Ollama (local).
   
   DEV MODE: Calls Vite dev proxy at `/api/{provider}/*` which forwards
             to the appropriate API server-side (so API keys are never exposed).
   
   PRODUCTION: Calls Firebase Cloud Function with quota enforcement based on
               user's subscription tier (free/mid/top).
*/

import { getFunctions, httpsCallable } from 'firebase/functions';

export interface LLMResponse {
  message?: string;
  events?: any[];
  [key: string]: any;
}

export interface LLMOptions {
  prompt: string;
  feature?: 'planner' | 'courage'; // Required in production for quota tracking
  response_json_schema?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  provider?: 'openai' | 'groq' | 'ollama';
}

// Check if running in dev mode (Vite development server)
const isDev = (import.meta as any).env?.DEV || false;

// Model mappings for different providers
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.2'
};

/**
 * DEV MODE: Call Vite proxy endpoint
 */
async function proxyLLM(provider: string, path: string, body: Record<string, any>) {
  const res = await fetch(`/api/${provider}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${provider.toUpperCase()} proxy error: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * PRODUCTION: Call Firebase Cloud Function
 */
async function callCloudFunction(options: LLMOptions) {
  const functions = getFunctions();
  const callAI = httpsCallable(functions, 'callAI');
  
  try {
    const result = await callAI({
      prompt: options.prompt,
      feature: options.feature || 'planner', // Default to planner if not specified
      provider: options.provider || 'groq',
      response_json_schema: options.response_json_schema,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      model: options.model,
    });
    
    return result.data;
  } catch (error: any) {
    // Firebase Functions errors come wrapped
    const message = error.message || 'AI request failed';
    
    // Handle quota exceeded errors
    if (message.includes('resource-exhausted') || message.includes('limit reached')) {
      throw new Error(`Quota limit reached. ${message}`);
    }
    
    if (message.includes('permission-denied')) {
      throw new Error(`Feature requires subscription. ${message}`);
    }
    
    throw new Error(message);
  }
}

/**
 * Main AI call function - routes to dev proxy or Cloud Function
 */
async function invokeAI(options: LLMOptions): Promise<any> {
  const {
    prompt,
    response_json_schema,
    temperature = 0.7,
    maxTokens = 2000,
    model,
    provider = 'groq',
    feature = 'planner',
  } = options;

  if (isDev) {
    // DEV MODE: Use Vite proxy
    const selectedModel = model || DEFAULT_MODELS[provider];

    const systemPrompt = response_json_schema
      ? `You are a helpful assistant. Your response MUST be valid JSON that matches this schema:\n${JSON.stringify(
          response_json_schema,
          null,
          2,
        )}\n\nRespond ONLY with valid JSON, no other text.`
      : 'You are a helpful assistant.';

    const payload: Record<string, any> = {
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    // Tell the model to output JSON only — Groq and OpenAI both support this
    if (response_json_schema) {
      payload.response_format = { type: 'json_object' };
    }

    const json = await proxyLLM(provider, '/chat/completions', payload);
    const content = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.message ?? null;

    if (!content) throw new Error(`No response from ${provider.toUpperCase()}`);

    if (response_json_schema) {
      try {
        // Strip markdown code fences if present
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, '');
          cleanedContent = cleanedContent.replace(/\n?```$/, '');
          cleanedContent = cleanedContent.trim();
        }

        // If there's preamble text before the JSON object, find the first { and parse from there
        if (!cleanedContent.startsWith('{') && !cleanedContent.startsWith('[')) {
          const jsonStart = cleanedContent.indexOf('{');
          if (jsonStart !== -1) {
            cleanedContent = cleanedContent.slice(jsonStart);
          }
        }
        
        return JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('LLM JSON parse error:', parseError, 'content:', content);
        // Last resort: return the text as the message without the raw JSON blob
        const preamble = content.split(/\{[\s\S]*\}/)?.[0]?.trim();
        return { message: preamble || content };
      }
    }

    return { message: content } as LLMResponse;
  } else {
    // PRODUCTION: Use Cloud Function with quota enforcement
    return callCloudFunction(options);
  }
}

export const llmService = {
  // Invoke LLM with optional JSON schema enforcement
  async invoke(options: LLMOptions): Promise<any> {
    return invokeAI(options);
  },

  async complete(prompt: string, temperature = 0.7, provider: 'openai' | 'groq' | 'ollama' = 'groq', feature: 'planner' | 'courage' = 'planner'): Promise<string> {
    const result = await invokeAI({
      prompt,
      temperature,
      provider,
      feature,
    });
    return result?.message || '';
  },

  // Streaming via the dev proxy is non-trivial; emulate streaming by returning full text and calling onChunk once.
  async stream(
    prompt: string,
    onChunk: (chunk: string) => void,
    systemPrompt = 'You are a helpful assistant.',
    provider: 'openai' | 'groq' | 'ollama' = 'groq',
    feature: 'planner' | 'courage' = 'courage'
  ): Promise<string> {
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;
    const resp = await invokeAI({ prompt: fullPrompt, temperature: 0.7, provider, feature });
    const msg = resp?.message || '';
    try {
      onChunk(msg);
    } catch (err) {
      console.warn('onChunk handler error', err);
    }
    return msg;
  },

  async extractJson(
    prompt: string,
    schema: Record<string, any>,
    provider: 'openai' | 'groq' | 'ollama' = 'groq',
    feature: 'planner' | 'courage' = 'planner'
  ): Promise<any> {
    return invokeAI({ prompt, response_json_schema: schema, provider, feature });
  },
};
