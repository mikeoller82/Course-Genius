
import { GoogleGenAI, Type } from "@google/genai";
import type { Course, CourseOutline, Module, GenerationUpdate, Lesson } from '../types';
import { GenerationStep } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const outlineSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A compelling and professional title for the course." },
        description: { type: Type.STRING, description: "A detailed, one-paragraph summary of the course, outlining what students will learn." },
        learningObjectives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 3-5 key learning objectives. Each objective should be a clear, concise statement starting with a verb."
        },
        moduleTitles: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of concise, descriptive titles for each module in the course. Should be between 3 and 7 modules."
        }
    },
    required: ["title", "description", "learningObjectives", "moduleTitles"],
};

const moduleSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The title of this course module." },
        description: { type: Type.STRING, description: "A brief, one-sentence description of what this module covers." },
        lessons: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of this specific lesson." },
                    content: { type: Type.STRING, description: "The full educational content for this lesson, written in a clear, engaging, and comprehensive manner. Should be at least 250 words and formatted with markdown for readability (e.g., using headers, lists, bold text)." },
                    videoScript: {
                        type: Type.STRING,
                        description: "A detailed video script for this lesson, including scene descriptions (e.g., '[SCENE: Whiteboard with diagrams]') and narration. The script should directly correspond to the lesson content, transforming it into a visual and spoken format."
                    },
                    imagePrompt: {
                        type: Type.STRING,
                        description: "A concise, descriptive prompt for a single visual aid (like a diagram or illustration) that would enhance the lesson. The prompt should be suitable for an AI image generation model. If no image is necessary, this field should be omitted."
                    }
                },
                required: ["title", "content", "videoScript"],
            }
        }
    },
    required: ["title", "description", "lessons"],
};

async function callApi<T>(prompt: string, schema: object): Promise<T> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                maxOutputTokens: 8192, 
                thinkingConfig: { thinkingBudget: 2048 },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as T;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate content from the AI. The service may be busy or the request may be too complex. Please try again.");
    }
}

async function generateImage(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        console.error("Error generating image with prompt:", prompt, error);
        // Return an empty string or handle error as needed, so one failed image doesn't stop the whole course
        return ""; 
    }
}

export async function* generateCourseStream(topic: string): AsyncGenerator<GenerationUpdate, void, void> {
    
    // Step 1: Generate Course Outline
    yield { step: GenerationStep.Outlining, message: 'Researching topic & designing curriculum...' };
    
    const outlinePrompt = `You are an expert instructional designer. Create a course outline for the topic: "${topic}". The outline should include a course title, a one-paragraph description, 3-5 learning objectives, and a list of 3-7 module titles.`;
    const outline = await callApi<CourseOutline>(outlinePrompt, outlineSchema);
    
    if (!outline.moduleTitles || outline.moduleTitles.length === 0) {
        throw new Error("Failed to generate a valid course outline with modules.");
    }
    yield { step: GenerationStep.Outlining, message: 'Curriculum designed successfully.', payload: outline };

    const totalModules = outline.moduleTitles.length;

    // Step 2: Generate each module's content and images
    for (let i = 0; i < totalModules; i++) {
        const moduleTitle = outline.moduleTitles[i];
        yield { 
            step: GenerationStep.GeneratingModules, 
            message: `Generating Module ${i + 1}/${totalModules}: ${moduleTitle}`
        };

        const modulePrompt = `
            You are an expert curriculum developer, video producer, and graphic designer. Generate the content for a single module of an online course about "${topic}".
            The module is titled: "${moduleTitle}".
            
            The content should include:
            1. A brief, one-sentence description of the module.
            2. A list of 2-4 detailed lessons.
            3. For each lesson, provide:
                a. A title.
                b. Comprehensive educational content (at least 250 words) formatted with markdown.
                c. A detailed video script that transforms the lesson content into a visual presentation.
                d. A concise, descriptive prompt for a single visual aid (like a diagram or illustration) to enhance the lesson. If no image is needed, omit the 'imagePrompt' field.

            Ensure the generated JSON strictly follows the provided schema. The module title in the response must exactly match "${moduleTitle}".
        `;

        const moduleContent = await callApi<Module>(modulePrompt, moduleSchema);
        moduleContent.title = moduleTitle; // Ensure title consistency

        // Step 2b: Generate images for lessons that have prompts
        const lessonsWithImagePrompts = moduleContent.lessons.filter(l => l.imagePrompt && l.imagePrompt.trim());
        if (lessonsWithImagePrompts.length > 0) {
            yield { 
                step: GenerationStep.GeneratingImages, 
                message: `Creating visual aids for Module ${i + 1}...`
            };

            await Promise.all(lessonsWithImagePrompts.map(async (lesson) => {
                if(lesson.imagePrompt) {
                    const imageBase64 = await generateImage(lesson.imagePrompt);
                    lesson.imageBase64 = imageBase64;
                }
            }));
        }
        
        yield { step: GenerationStep.GeneratingModules, message: `Completed Module ${i + 1}/${totalModules}`, payload: moduleContent };
    }
}
