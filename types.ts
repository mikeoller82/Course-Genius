export enum Difficulty {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
}

export enum ModelProvider {
  Gemini = "gemini",
  OpenRouter = "openrouter",
}

export enum CourseFormat {
  Standard = "Standard Course",
  Bootcamp = "Bootcamp (Project-Based)",
  Asynchronous = "Asynchronous Self-Paced",
  Synchronous = "Synchronous Live Course",
  Email = "Email Course",
  Podcast = "Podcast Series",
  Workshop = "Practical Workshop",
  Blended = "Blended Learning",
}

export interface Lesson {
  title: string;
  content: string;
  videoScript?: string;
  imagePrompt?: string;
  imageBase64?: string;
}

export interface Question {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: Question[];
}

export interface Worksheet {
  title: string;
  content: string; // Markdown formatted
}

export interface ResourceSheet {
  title: string;
  content: string; // Markdown formatted
}

export interface Module {
  title: string;
  description: string;
  lessons: Lesson[];
  quiz?: Quiz;
  worksheet?: Worksheet;
  resourceSheet?: ResourceSheet;
}

export interface Source {
  title: string;
  url: string;
}

export interface Course {
  title:string;
  description: string;
  learningObjectives: string[];
  modules: Module[];
  sources?: Source[];
}

export interface CourseOutline {
  title: string;
  description: string;
  learningObjectives: string[];
  moduleTitles: string[];
  sources?: Source[];
}

export enum GenerationStep {
  Idle = "IDLE",
  Outlining = "OUTLINING",
  GeneratingModules = "GENERATING_MODULES",
  GeneratingImages = "GENERATING_IMAGES",
  Done = "DONE",
}

export interface GenerationUpdate {
    step: GenerationStep;
    message: string;
    payload?: any;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  contextLength?: number;
  supportsImages?: boolean;
  supportsStreaming?: boolean;
  cost?: {
    input: number;
    output: number;
  };
}

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  supportsImages: boolean;
  supportsSearch: boolean;
}