import { AI_MODELS } from '../constants';

export type AIModel = {
  title: string;
  models: readonly string[];
};

export type AIProvider = keyof typeof AI_MODELS;
export type AIModels = Record<AIProvider, AIModel>;
