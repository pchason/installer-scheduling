import { Mastra } from '@mastra/core';

export const mastra = new Mastra({
  name: 'installer-scheduling',
  description: 'AI-powered scheduling system for construction installers',
  apiKey: process.env.OPENAI_API_KEY,
});
