export const AI_MODELS = {
  openrouter: {
    title: 'OpenRouter',
    models: [
      'google/gemma-4-26b-a4b-it:free',
      'google/gemma-4-31b-it:free',
      'google/lyria-3-pro-preview',
      'google/lyria-3-clip-preview',
      'openai/gpt-oss-120b:free',
      'openai/gpt-oss-20b:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
    ],
  },
} as const;

export const DEFAULT_PROVIDER = 'openrouter';
