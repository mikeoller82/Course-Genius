
export interface Lesson {
  title: string;
  content: string;
  videoScript?: string;
  imagePrompt?: string;
  imageBase64?: string;
}

export interface Module {
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  title: string;
  description: string;
  learningObjectives: string[];
  modules: Module[];
}

export interface CourseOutline {
  title: string;
  description: string;
  learningObjectives: string[];
  moduleTitles: string[];
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
