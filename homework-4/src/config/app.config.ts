import { registerAs } from '@nestjs/config';

const appConfig = registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
}));

const dbConfig = registerAs('db', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  url: process.env.DATABASE_URL,
}));

const googleConfig = registerAs('google', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
}));

const aiConfig = registerAs('ai', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  openRouterApiKey: process.env.OPEN_ROUTER_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  togetherAiApiKey: process.env.TOGETHER_AI_API_KEY,
}));

export { appConfig, dbConfig, googleConfig, aiConfig };
