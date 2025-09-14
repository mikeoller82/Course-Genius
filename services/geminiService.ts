import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { CourseOutline, Module, Difficulty, CourseFormat, GenerationUpdate, Source } from '../types';
import { GenerationStep } from '../types';

// Per instructions, API key is handled by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJson = (text: string): string => {
    // Attempts to extract a valid JSON object from a string that might be wrapped in markdown.
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Fallback for cases where there are no markdown backticks
    return text.trim();
};

const moduleSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        lessons: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING, description: "Lesson content in Markdown format." },
                    videoScript: { type: Type.STRING, description: "A short video script for this lesson. Can be null." },
                    imagePrompt: { type: Type.STRING, description: "A descriptive prompt for an AI image generator to create a relevant image for this lesson. Focus on clear, concrete subjects. Can be null." },
                },
                required: ["title", "content"]
            }
        },
        quiz: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            questionText: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.STRING },
                            explanation: { type: Type.STRING }
                        },
                        required: ["questionText", "options", "correctAnswer", "explanation"]
                    }
                }
            },
        },
        worksheet: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING, description: "Worksheet content in Markdown format." }
            },
        },
        resourceSheet: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING, description: "A list of additional resources in Markdown format." }
            },
        }
    },
    required: ["title", "description", "lessons"]
};


export async function* generateCourseStream(
    topic: string,
    generateImages: boolean,
    difficulty: Difficulty,
    courseFormat: CourseFormat
): AsyncGenerator<GenerationUpdate> {

    // Phase 1: Outlining
    yield { step: GenerationStep.Outlining, message: 'Phase 1: Generating course outline...' };

    const outlinePrompt = `You are an expert instructional designer tasked with creating a course outline.
The topic for the course is: "${topic}".
The target audience difficulty is: "${difficulty}".
The desired course format is: "${courseFormat}".

Based on this, please generate a comprehensive course outline. The outline should include:
1.  A compelling and SEO-friendly course title.
2.  A concise and engaging course description.
3.  A list of clear and measurable learning objectives.
4.  A list of module titles that logically structure the course content.

Use Google Search to find up-to-date information and ensure the outline is relevant and comprehensive.

IMPORTANT: Your entire response must be ONLY a single, valid JSON object that adheres to the following TypeScript interface. Do not include any other text, markdown formatting, or explanations before or after the JSON.

interface CourseOutline {
  title: string;
  description: string;
  learningObjectives: string[];
  moduleTitles: string[];
}`;

    let courseOutline: CourseOutline;
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: outlinePrompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        // Per guidelines, must extract URLs from grounding chunks.
        const sources: Source[] = result.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => ({
                title: chunk.web?.title || 'Unknown Source',
                url: chunk.web?.uri || '',
            }))
            .filter((source: Source) => source.url) ?? [];

        // Remove duplicate sources by URL
        const uniqueSources = Array.from(new Map(sources.map(s => [s.url, s])).values());
        
        const responseText = result.text;
        const cleanedJson = cleanJson(responseText);
        courseOutline = JSON.parse(cleanedJson);
        courseOutline.sources = uniqueSources;

    } catch (e) {
        console.error("Error generating course outline:", e);
        throw new Error("Failed to generate the course outline. The model's response was invalid.");
    }

    yield { step: GenerationStep.Outlining, message: 'Course outline complete.', payload: courseOutline };

    // Phase 2: Generating Modules
    for (let i = 0; i < courseOutline.moduleTitles.length; i++) {
        const moduleTitle = courseOutline.moduleTitles[i];
        yield { step: GenerationStep.GeneratingModules, message: `Phase 2: Generating module ${i + 1}/${courseOutline.moduleTitles.length}: ${moduleTitle}` };

        const modulePrompt = `You are an expert instructional designer creating content for a single module of a larger course.

Course Topic: "${topic}"
Course Description: "${courseOutline.description}"
Course Learning Objectives: ${JSON.stringify(courseOutline.learningObjectives)}

You are now generating content for this specific module:
Module Title: "${moduleTitle}"

Based on the overall course context, please generate the complete content for this module.
The module content must be comprehensive and align with the specified difficulty: "${difficulty}" and format: "${courseFormat}".

Your response must be a single, valid JSON object that conforms to the provided schema. The JSON object should include:
1.  'title': The module title (should be the same as provided).
2.  'description': A brief description of what this module covers.
3.  'lessons': An array of lesson objects. Each lesson must have:
    - 'title': The lesson title.
    - 'content': The detailed lesson content in Markdown format.
    - 'videoScript': (Optional) A short, engaging video script for the lesson.
    - 'imagePrompt': (Optional) A simple, descriptive prompt for an AI image generator to create a relevant visual for the lesson. Focus on clear, concrete subjects and actions.
4.  'quiz': (Optional) A quiz object with a title and an array of multiple-choice questions to test understanding of the module. Each question needs the question text, options, the correct answer, and an explanation.
5.  'worksheet': (Optional) A worksheet object with a title and content (in Markdown) that includes practical exercises or questions for the learner.
6.  'resourceSheet': (Optional) A resource sheet object with a title and content (in Markdown) listing further reading, links, or tools related to the module.

Ensure all text content, especially lesson content, worksheets, and resource sheets, is formatted using Markdown for clear presentation.`;
        
        let module: Module;
        try {
             const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: modulePrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: moduleSchema,
                }
            });
            const parsedJson = JSON.parse(result.text);
            module = parsedJson as Module;

        } catch (e) {
            console.error(`Error generating module "${moduleTitle}":`, e);
            throw new Error(`Failed to generate content for module: ${moduleTitle}.`);
        }
        

        if (generateImages) {
            for (const lesson of module.lessons) {
                if (lesson.imagePrompt) {
                     yield { step: GenerationStep.GeneratingImages, message: `Generating image for: ${lesson.title}` };
                     try {
                        const imageResult = await ai.models.generateContent({
                            model: 'gemini-2.5-flash-image-preview',
                            contents: {
                                parts: [{ text: lesson.imagePrompt }],
                            },
                            config: {
                                responseModalities: [Modality.IMAGE, Modality.TEXT],
                            },
                        });

                        if (imageResult.candidates && imageResult.candidates.length > 0) {
                            for (const part of imageResult.candidates[0].content.parts) {
                                if (part.inlineData) {
                                    lesson.imageBase64 = part.inlineData.data;
                                    break; // Found an image, stop looking.
                                }
                            }
                        }
                     } catch (e) {
                         console.error(`Failed to generate image for lesson "${lesson.title}":`, e);
                         // Don't throw, just log and continue. The course can exist without images.
                     }
                }
            }
        }

        yield { step: GenerationStep.GeneratingModules, message: `Module ${i + 1} complete.`, payload: module };
    }
}