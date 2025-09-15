import OpenAI from 'openai';
import type { CourseOutline, Module, Difficulty, CourseFormat, GenerationUpdate, ModelConfig, ModelInfo, Source } from '../types';
import { GenerationStep, ModelProvider } from '../types';
import type { AIService } from './aiService';

export class OpenRouterService implements AIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Course Genius',
      },
    });
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
          !model.id.includes('whisper') // Skip audio models
        )
        .slice(0, 20) // Limit to top 20 models to avoid overwhelming UI
        .map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          provider: ModelProvider.OpenRouter,
          contextLength: model.context_length,
          supportsImages: false, // Most OpenRouter models don't generate images
          supportsStreaming: true,
          cost: model.pricing ? {
            input: parseFloat(model.pricing.prompt) * 1000000, // Convert to per million tokens
            output: parseFloat(model.pricing.completion) * 1000000,
          } : undefined,
        }));
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      // Return some popular models as fallback
      return [
        {
          id: 'anthropic/claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: ModelProvider.OpenRouter,
          contextLength: 200000,
          supportsImages: false,
          supportsStreaming: true,
        },
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o',
          provider: ModelProvider.OpenRouter,
          contextLength: 128000,
          supportsImages: false,
          supportsStreaming: true,
        },
        {
          id: 'google/gemini-pro-1.5',
          name: 'Gemini Pro 1.5',
          provider: ModelProvider.OpenRouter,
          contextLength: 1000000,
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
    // Extract JSON from markdown code blocks or plain text
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Try to extract JSON object from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return text.trim();
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

IMPORTANT: Your entire response must be ONLY a single, valid JSON object that adheres to the following TypeScript interface. Do not include any other text, markdown formatting, or explanations before or after the JSON.

interface CourseOutline {
  title: string;
  description: string;
  learningObjectives: string[];
  moduleTitles: string[];
}`;

    let courseOutline: CourseOutline;
    try {
      const completion = await this.client.chat.completions.create({
        model: modelConfig.model,
        messages: [{ role: 'user', content: outlinePrompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      const cleanedJson = this.cleanJson(responseText);
      courseOutline = JSON.parse(cleanedJson);

      // OpenRouter doesn't have search grounding, so no sources
      courseOutline.sources = [];

    } catch (error) {
      console.error('Error generating course outline:', error);
      throw new Error('Failed to generate the course outline. The model response was invalid.');
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

Your response must be a single, valid JSON object that includes:
1. 'title': The module title (should be the same as provided).
2. 'description': A brief description of what this module covers.
3. 'lessons': An array of lesson objects. Each lesson must have:
   - 'title': The lesson title.
   - 'content': The detailed lesson content in Markdown format (minimum 500 words).
   - 'videoScript': (Optional) A short, engaging video script for the lesson.
   - 'imagePrompt': (Optional) A simple, descriptive prompt for an AI image generator.
4. 'quiz': (Optional) A quiz object with a title and an array of multiple-choice questions.
5. 'worksheet': (Optional) A worksheet object with practical exercises in Markdown.
6. 'resourceSheet': (Optional) A resource sheet with additional learning materials in Markdown.

Ensure all content is formatted using Markdown for clear presentation.`;

      let module: Module;
      try {
        const completion = await this.client.chat.completions.create({
          model: modelConfig.model,
          messages: [{ role: 'user', content: modulePrompt }],
          temperature: 0.7,
          max_tokens: 4000,
        });

        const responseText = completion.choices[0]?.message?.content || '';
        const cleanedJson = this.cleanJson(responseText);
        module = JSON.parse(cleanedJson);

      } catch (error) {
        console.error(`Error generating module "${moduleTitle}":`, error);
        throw new Error(`Failed to generate content for module: ${moduleTitle}.`);
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