import type { CourseOutline, Module, Difficulty, CourseFormat, GenerationUpdate, ModelConfig, ModelInfo, ModelProvider } from '../types';

// Unified interface that both Gemini and OpenRouter services will implement
export interface AIService {
  generateCourseStream(
    topic: string,
    generateImages: boolean,
    difficulty: Difficulty,
    courseFormat: CourseFormat,
    modelConfig: ModelConfig
  ): AsyncGenerator<GenerationUpdate>;

  getAvailableModels(): Promise<ModelInfo[]>;

  supportsImages(): boolean;
  supportsSearch(): boolean;
}

// Factory function to create the appropriate AI service based on provider
export async function createAIService(provider: string): Promise<AIService> {
  switch (provider) {
    case 'gemini': {
      const { GeminiService } = await import('./geminiService');
      return new GeminiService();
    }
    case 'openrouter': {
      const { OpenRouterService } = await import('./openRouterService');
      return new OpenRouterService();
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Default models configuration
export const DEFAULT_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: ModelProvider.Gemini,
    contextLength: 128000,
    supportsImages: true,
    supportsStreaming: true,
  },
  {
    id: 'gemini-2.5-flash-image-preview',
    name: 'Gemini 2.5 Flash (Image Generation)',
    provider: ModelProvider.Gemini,
    contextLength: 128000,
    supportsImages: true,
    supportsStreaming: true,
  }
];