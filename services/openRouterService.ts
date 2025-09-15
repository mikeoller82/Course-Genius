import OpenAI from 'openai';
import type { CourseOutline, Module, Difficulty, CourseFormat, GenerationUpdate, ModelConfig, ModelInfo } from '../types';
import { GenerationStep, ModelProvider } from '../types';
import type { AIService } from './aiService';

export class OpenRouterService implements AIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn('OpenRouter API key not found. OpenRouter models may not work properly.');
    } else {
      console.log('OpenRouter API key loaded:', apiKey.substring(0, 10) + '...');
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Course Genius',
      },
    });
  }

  // Helper function to determine max output tokens based on model
  private getMaxOutputTokens(modelId: string, contextLength: number): number {
    // Model-specific max output token limits based on research
    const modelLimits: { [key: string]: number } = {
      // Claude models
      'anthropic/claude-3.5-sonnet': 8192,
      'anthropic/claude-3-sonnet': 4096,
      'anthropic/claude-3-haiku': 4096,
      'anthropic/claude-3-opus': 4096,
      'anthropic/claude-opus-4.1': 32000,

      // OpenAI models
      'openai/gpt-4o': 16384,
      'openai/gpt-4o-mini': 16384,
      'openai/gpt-4-turbo': 4096,
      'openai/gpt-4': 8192,
      'openai/gpt-5': 128000,

      // Google models
      'google/gemini-pro-1.5': 65535,
      'google/gemini-2.5-flash-lite': 65535,
      'google/gemini-exp-1121': 65535,

      // Meta models
      'meta-llama/llama-3.1-405b': 32768,
      'meta-llama/llama-3.1-70b': 32768,
      'meta-llama/llama-3.1-8b': 32768,

      // Mistral models
      'mistralai/mistral-large': 32768,
      'mistralai/codestral-2508': 32768,

      // Other models
      'qwen/qwen-3-next-80b': 32768,
      'deepseek/deepseek-chat': 16384,
    };

    // Check for exact match first
    if (modelLimits[modelId]) {
      return modelLimits[modelId];
    }

    // Fallback based on model family patterns
    if (modelId.includes('claude')) {
      return modelId.includes('3.5') ? 8192 : 4096;
    }
    if (modelId.includes('gpt-4o') || modelId.includes('gpt-5')) {
      return 16384;
    }
    if (modelId.includes('gpt-4')) {
      return 8192;
    }
    if (modelId.includes('gemini')) {
      return 32768;
    }
    if (modelId.includes('llama')) {
      return 32768;
    }
    if (modelId.includes('mistral')) {
      return 32768;
    }

    // Conservative fallback: use 1/4 of context length, min 8192, max 32768
    return Math.min(32768, Math.max(8192, Math.floor(contextLength / 4)));
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      const data = await response.json();

      // Filter and map models suitable for course generation
      return data.data
        .filter((model: any) =>
          model.context_length >= 32000 && // Need good context for course generation
          !model.id.includes('vision') && // Skip vision-only models for now
          !model.id.includes('whisper') && // Skip audio models
          !model.id.includes('embedding') // Skip embedding models
        )
        .slice(0, 25) // Increased to 25 models for better selection
        .map((model: any) => {
          const maxOutputTokens = this.getMaxOutputTokens(model.id, model.context_length);
          return {
            id: model.id,
            name: model.name || model.id,
            provider: ModelProvider.OpenRouter,
            contextLength: model.context_length,
            maxOutputTokens: maxOutputTokens,
            supportsImages: false, // Most OpenRouter models don't generate images
            supportsStreaming: true,
            cost: model.pricing ? {
              input: parseFloat(model.pricing.prompt) * 1000000, // Convert to per million tokens
              output: parseFloat(model.pricing.completion) * 1000000,
            } : undefined,
          };
        });
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      // Return some popular models as fallback with proper max output tokens
      return [
        {
          id: 'anthropic/claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: ModelProvider.OpenRouter,
          contextLength: 200000,
          maxOutputTokens: 8192,
          supportsImages: false,
          supportsStreaming: true,
        },
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o',
          provider: ModelProvider.OpenRouter,
          contextLength: 128000,
          maxOutputTokens: 16384,
          supportsImages: false,
          supportsStreaming: true,
        },
        {
          id: 'google/gemini-pro-1.5',
          name: 'Gemini Pro 1.5',
          provider: ModelProvider.OpenRouter,
          contextLength: 1000000,
          maxOutputTokens: 32768,
          supportsImages: false,
          supportsStreaming: true,
        },
        {
          id: 'meta-llama/llama-3.1-405b',
          name: 'Llama 3.1 405B',
          provider: ModelProvider.OpenRouter,
          contextLength: 131072,
          maxOutputTokens: 32768,
          supportsImages: false,
          supportsStreaming: true,
        },
      ];
    }
  }

  supportsImages(): boolean {
    return false; // OpenRouter models generally don't generate images
  }

  supportsSearch(): boolean {
    return false; // OpenRouter doesn't have Google Search integration
  }

  private cleanJson(text: string): string {
    // First, try to extract JSON from markdown code blocks
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      text = match[1].trim();
    }

    // Try to find the first valid JSON object
    let startIndex = text.indexOf('{');
    if (startIndex === -1) {
      return text.trim();
    }

    // Find the matching closing brace
    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let escaped = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex !== -1) {
      const jsonStr = text.substring(startIndex, endIndex + 1);

      // Try to fix common JSON issues
      let cleaned = jsonStr
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix unescaped quotes in strings (basic attempt)
        .replace(/([^\\])"([^",:}\]]+)"([^",:}\]]+)"/g, '$1"$2\\"$3"')
        // Remove any trailing text after the JSON
        .trim();

      return cleaned;
    }

    return text.trim();
  }

  private safeJsonParse<T>(text: string, context: string): T {
    try {
      const cleanedJson = this.cleanJson(text);
      return JSON.parse(cleanedJson);
    } catch (error) {
      console.error(`JSON parsing error in ${context}:`, error);
      console.error(`Raw response text:`, text.substring(0, 1000) + '...');
      console.error(`Cleaned JSON:`, this.cleanJson(text).substring(0, 1000) + '...');

      // Try a more aggressive cleaning approach
      try {
        const aggressiveClean = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/^[^{]*({.*})[^}]*$/s, '$1')
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/(['"])\s*:\s*(['"][^'"]*)\n([^'"]*['"])/g, '$1: $2$3')
          .trim();

        return JSON.parse(aggressiveClean);
      } catch (secondError) {
        throw new Error(`Failed to parse JSON response in ${context}. The AI model may have generated invalid JSON format.`);
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper function to get appropriate max_tokens based on model and content type
  private getTokenLimit(modelId: string, maxOutputTokens: number, isOutline: boolean = false): number {
    if (isOutline) {
      // For course outlines, use smaller token limit (2-4K is usually sufficient)
      return Math.min(4000, Math.floor(maxOutputTokens * 0.5));
    }

    // For module content, use most of the available output tokens
    // Leave some buffer for model overhead and ensure we don't hit limits
    const buffer = Math.min(2048, Math.floor(maxOutputTokens * 0.1)); // 10% buffer, max 2K
    return Math.max(8192, maxOutputTokens - buffer); // Minimum 8K for comprehensive modules
  }

  private async retryApiCall<T>(
    operation: (attempt: number) => Promise<T>,
    context: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt}/${maxRetries} failed for ${context}:`, error);

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying ${context} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  async* generateCourseStream(
    topic: string,
    generateImages: boolean,
    difficulty: Difficulty,
    courseFormat: CourseFormat,
    modelConfig: ModelConfig
  ): AsyncGenerator<GenerationUpdate> {

    // Phase 1: Generate course outline
    yield { step: GenerationStep.Outlining, message: 'Phase 1: Generating course outline...' };

    const outlinePrompt = `You are an expert instructional designer tasked with creating a course outline.
The topic for the course is: "${topic}".
The target audience difficulty is: "${difficulty}".
The desired course format is: "${courseFormat}".

Based on this, please generate a comprehensive course outline. The outline should include:
1. A compelling and SEO-friendly course title.
2. A concise and engaging course description.
3. A list of clear and measurable learning objectives.
4. A list of module titles that logically structure the course content.

IMPORTANT: Your entire response must be ONLY a single, valid JSON object. Follow these strict formatting rules:
1. Start your response with { and end with }
2. Use double quotes for all strings
3. Escape any quotes within strings with \"
4. Do not include trailing commas
5. Do not include any markdown formatting, explanations, or other text

The JSON must adhere to this TypeScript interface:
interface CourseOutline {
  title: string;
  description: string;
  learningObjectives: string[];
  moduleTitles: string[];
}`;

    // Get model info to determine appropriate token limits
    const models = await this.getAvailableModels();
    const modelInfo = models.find(m => m.id === modelConfig.model);
    const maxOutputTokens = modelInfo?.maxOutputTokens || 8192;

    let courseOutline: CourseOutline;
    try {
      courseOutline = await this.retryApiCall(
        async (attempt: number) => {
          // Use appropriate token limit for outline generation
          const tokenLimit = this.getTokenLimit(modelConfig.model, maxOutputTokens, true);
          console.log(`Attempt ${attempt} for course outline with ${tokenLimit} token limit (max available: ${maxOutputTokens})`);

          const completion = await this.client.chat.completions.create({
            model: modelConfig.model,
            messages: [{ role: 'user', content: outlinePrompt }],
            temperature: 0.7,
            max_tokens: tokenLimit,
          });

          const responseText = completion.choices[0]?.message?.content || '';

          // Log response for debugging
          console.log('OpenRouter API Response for course outline:', {
            model: modelConfig.model,
            attempt: attempt,
            responseLength: responseText.length,
            tokenLimit: tokenLimit,
            maxOutputTokens: maxOutputTokens,
            response: responseText.substring(0, 200) + '...',
          });

          if (!responseText || responseText.trim().length === 0) {
            throw new Error(`OpenRouter model "${modelConfig.model}" returned an empty response on attempt ${attempt}. This might be due to API limits or model availability.`);
          }

          const result = this.safeJsonParse<CourseOutline>(responseText, `course outline generation (attempt ${attempt})`);

          // OpenRouter doesn't have search grounding, so no sources
          result.sources = [];

          return result;
        },
        'course outline generation',
        3, // maxRetries
        1000 // baseDelay - 1 second
      );

    } catch (error) {
      console.error('Error generating course outline after all retries:', error);
      throw new Error('Failed to generate the course outline after 3 attempts. The model response was invalid.');
    }

    yield { step: GenerationStep.Outlining, message: 'Course outline complete.', payload: courseOutline };

    // Phase 2: Generate modules
    for (let i = 0; i < courseOutline.moduleTitles.length; i++) {
      const moduleTitle = courseOutline.moduleTitles[i];
      yield {
        step: GenerationStep.GeneratingModules,
        message: `Phase 2: Generating module ${i + 1}/${courseOutline.moduleTitles.length}: ${moduleTitle}`
      };

      const modulePrompt = `You are an expert instructional designer creating content for a single module of a larger course.

Course Topic: "${topic}"
Course Description: "${courseOutline.description}"
Course Learning Objectives: ${JSON.stringify(courseOutline.learningObjectives)}

You are now generating content for this specific module:
Module Title: "${moduleTitle}"

Based on the overall course context, please generate the complete content for this module.
The module content must be comprehensive and align with the specified difficulty: "${difficulty}" and format: "${courseFormat}".

IMPORTANT: Your response must be ONLY a single, valid JSON object. Follow these strict formatting rules:
1. Start your response with { and end with }
2. Use double quotes for all strings
3. Escape any quotes within strings with \"
4. Do not include trailing commas
5. Do not include any markdown formatting, explanations, or other text outside the JSON

The JSON object should include:
1. 'title': The module title (should be the same as provided)
2. 'description': A brief description of what this module covers
3. 'lessons': An array of lesson objects. Each lesson must have:
   - 'title': The lesson title
   - 'content': The detailed lesson content in Markdown format (minimum 500 words)
   - 'videoScript': (Optional but encouraged) A short, engaging video script for the lesson that could be used for video creation. Should be conversational and educational.
   - 'imagePrompt': (Optional) A simple, descriptive prompt for an AI image generator to create a relevant visual for the lesson. Focus on clear, concrete subjects and actions.
4. 'quiz': (Optional but encouraged) A quiz object with a title and an array of multiple-choice questions to test understanding of the module. Each question needs:
   - 'questionText': The question text
   - 'options': Array of possible answers
   - 'correctAnswer': The correct answer (must match one of the options exactly)
   - 'explanation': An explanation of why this is the correct answer
5. 'worksheet': (Optional but encouraged) A worksheet object with a title and content (in Markdown) that includes practical exercises, assignments, or hands-on activities for the learner to apply what they've learned.
6. 'resourceSheet': (Optional but encouraged) A resource sheet object with a title and content (in Markdown) listing further reading, useful links, tools, or additional materials related to the module.

Ensure all text content, especially lesson content, worksheets, and resource sheets, is formatted using Markdown for clear presentation. Video scripts should be engaging and suitable for educational content creation.`;

      let module: Module;
      try {
        module = await this.retryApiCall(
          async (attempt: number) => {
            // Use appropriate token limit for module generation (much higher for comprehensive content)
            const tokenLimit = this.getTokenLimit(modelConfig.model, maxOutputTokens, false);
            console.log(`Attempt ${attempt} for module "${moduleTitle}" with ${tokenLimit} token limit (max available: ${maxOutputTokens})`);

            const completion = await this.client.chat.completions.create({
              model: modelConfig.model,
              messages: [{ role: 'user', content: modulePrompt }],
              temperature: 0.7,
              max_tokens: tokenLimit,
            });

            const responseText = completion.choices[0]?.message?.content || '';

            if (!responseText || responseText.trim().length === 0) {
              throw new Error(`Empty response from model on attempt ${attempt}`);
            }

            // Log response details for debugging
            console.log(`Module "${moduleTitle}" attempt ${attempt} response:`, {
              responseLength: responseText.length,
              tokenLimit: tokenLimit,
              maxOutputTokens: maxOutputTokens,
              utilizationPercent: Math.round((responseText.length / tokenLimit) * 100),
              truncated: responseText.length >= tokenLimit * 0.95, // Likely truncated if very close to limit
            });

            return this.safeJsonParse<Module>(responseText, `module "${moduleTitle}" generation (attempt ${attempt})`);
          },
          `module "${moduleTitle}" generation`,
          3, // maxRetries
          2000 // baseDelay - 2 seconds
        );

      } catch (error) {
        console.error(`Error generating module "${moduleTitle}" after all retries:`, error);
        throw new Error(`Failed to generate content for module: ${moduleTitle} after 3 attempts.`);
      }

      // Note: OpenRouter doesn't support image generation like Gemini
      // generateImages flag is ignored for OpenRouter models

      yield {
        step: GenerationStep.GeneratingModules,
        message: `Module ${i + 1} complete.`,
        payload: module
      };
    }
  }
}