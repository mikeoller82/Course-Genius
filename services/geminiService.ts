
import { GoogleGenAI, Type } from "@google/genai";
import type { Course, CourseOutline, Module, GenerationUpdate, Lesson } from '../types';
import { GenerationStep, Difficulty } from '../types';

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

// Base module schema without imagePrompt
const baseModuleSchema = {
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
                },
                required: ["title", "content", "videoScript"],
            }
        }
    },
    required: ["title", "description", "lessons"],
};

// Function to dynamically create the module schema
const getModuleSchema = (includeImages: boolean) => {
    if (!includeImages) {
        return baseModuleSchema;
    }

    // Create a deep copy to avoid mutating the base schema
    const schema = JSON.parse(JSON.stringify(baseModuleSchema));
    
    // Add imagePrompt to lesson properties
    schema.properties.lessons.items.properties.imagePrompt = {
        type: Type.STRING,
        description: "A concise, descriptive prompt for a single visual aid (like a diagram, chart, or illustration) that would enhance this lesson. The prompt should be detailed enough for an AI image generator to create a relevant and high-quality visual. If no image is suitable, this should be an empty string."
    };
    
    // Make imagePrompt required
    schema.properties.lessons.items.required.push("imagePrompt");

    return schema;
};


async function callGeminiWithSchema(prompt: string, schema: any): Promise<any> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });

    try {
        let jsonStr = response.text.trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse JSON:", response.text);
        throw new Error("AI returned invalid JSON format.");
    }
}

async function generateImage(prompt: string): Promise<string> {
    try {
        console.log(`Generating image for prompt: ${prompt.substring(0, 100)}...`);
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("AI did not return any images.");
        }

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("Generated image data is empty.");
        }
        
        return base64ImageBytes;

    } catch (error) {
        console.error("Full image generation error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate image. Reason: ${errorMessage}`);
    }
}

export async function* generateCourseStream(topic: string, includeImages: boolean, difficulty: Difficulty): AsyncGenerator<GenerationUpdate> {
    yield { step: GenerationStep.Outlining, message: "Designing course curriculum..." };

    const outlinePrompt = `Create a comprehensive course outline for the topic: "${topic}". The course must be tailored for a **${difficulty}** audience. The outline should include a course title, a detailed description, 3-5 key learning objectives, and a list of 3-7 module titles designed for progressive learning.`;
    const outline: CourseOutline = await callGeminiWithSchema(outlinePrompt, outlineSchema);
    yield { step: GenerationStep.Outlining, message: "Curriculum designed.", payload: outline };

    const moduleSchema = getModuleSchema(includeImages);
    const allModuleTitlesString = outline.moduleTitles.join('", "');

    for (const [index, moduleTitle] of outline.moduleTitles.entries()) {
        yield { step: GenerationStep.GeneratingModules, message: `Generating module: "${moduleTitle}"...` };

        const previousModuleTitles = outline.moduleTitles.slice(0, index);
        const contextInstruction = previousModuleTitles.length > 0
            ? `This module must build upon concepts from the previous modules: "${previousModuleTitles.join('", "')}". Do NOT repeat information already covered.`
            : "This is the first module, so it should introduce the foundational concepts of the course.";

        let modulePrompt = `You are an expert instructional designer building a course about "${topic}" for a **${difficulty}** audience.
The entire course is structured into these modules, in this order: "${allModuleTitlesString}".

Your current task is to generate the content for the module titled: "${moduleTitle}".

**CRITICAL Directives:**
1.  **Progressive Learning:** ${contextInstruction} Introduce new, more advanced topics specific to this module.
2.  **Unique Content:** Ensure the lessons within this module are distinct, valuable, and do not regurgitate information from earlier in the course.
3.  **Required Output:** For this module, provide a brief description and a series of detailed lessons. For each lesson, you must generate:
    a. A lesson title.
    b. Comprehensive lesson content (at least 250 words, formatted with markdown).
    c. A detailed video script that corresponds to the lesson content.
`;

        if (includeImages) {
             modulePrompt += `    d. A descriptive prompt for an AI to generate a relevant visual aid. If no image is needed, return an empty string for the prompt.`;
        }

        const module: Module = await callGeminiWithSchema(modulePrompt, moduleSchema);
        
        if (includeImages) {
            for (const lesson of module.lessons) {
                if (lesson.imagePrompt && lesson.imagePrompt.trim() !== "") {
                    try {
                        yield { step: GenerationStep.GeneratingImages, message: `Creating image for: "${lesson.title}"` };
                        const imageBase64 = await generateImage(lesson.imagePrompt);
                        lesson.imageBase64 = imageBase64;
                    } catch (imgErr) {
                        console.error(`Error generating image with prompt:\n${lesson.imagePrompt}\n`, imgErr);
                        // Continue without the image
                    }
                }
            }
        }
        
        yield { step: GenerationStep.GeneratingModules, message: `Completed module: ${module.title}`, payload: module };
    }
}