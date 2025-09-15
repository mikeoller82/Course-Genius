# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Course Genius is a React-based AI course generator that supports multiple AI providers (Google Gemini and OpenRouter) to create comprehensive courses from user topics. Users can select from various AI models to generate structured courses with modules, lessons, quizzes, worksheets, and optional AI-generated images.

## Development Commands

### Setup and Environment
- **Install dependencies**: `npm install`
- **Set up environment**: Create `.env.local` with:
  - `GEMINI_API_KEY=your_gemini_api_key` (required for Gemini models)
  - `OPENROUTER_API_KEY=your_openrouter_api_key` (optional, for OpenRouter models)
- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm preview`

### Testing and Validation
- No test framework is currently configured
- The application uses TypeScript for type safety validation

## Architecture Overview

### Core Data Flow
1. **User Input** → Topic, difficulty, format, and model selections in `TopicInput`
2. **AI Service Selection** → Factory pattern creates appropriate service (Gemini or OpenRouter)
3. **Stream Generation** → AI service creates courses in phases:
   - Phase 1: Course outline generation (with Google Search grounding for Gemini)
   - Phase 2: Module-by-module content generation with optional image creation (Gemini only)
4. **Real-time Updates** → Progress tracking via `GenerationUpdate` stream
5. **Display** → `CourseDisplay` renders the complete course structure

### Key Architectural Components

**Core Types (`types.ts`)**:
- `Course`: Complete course structure with modules, lessons, quizzes
- `Module`: Individual course section with lessons and assessments
- `GenerationStep`: Enum tracking course creation phases
- `Difficulty`/`CourseFormat`: Enums for course configuration
- `ModelProvider`: Enum for AI providers (Gemini, OpenRouter)
- `ModelInfo`: Model metadata including capabilities and pricing
- `ModelConfig`: Configuration for AI service calls

**Services Layer**:
- `aiService.ts`: Unified interface and factory pattern for AI providers
  - `AIService` interface implemented by all providers
  - `createAIService()` factory function for provider instantiation
  - Abstracts differences between Gemini and OpenRouter APIs
- `geminiService.ts`: Google Gemini API integration (`GeminiService` class)
  - Uses structured JSON schema for module generation
  - Implements streaming course generation with progress updates
  - Handles Google Search grounding for up-to-date information
  - Supports AI image generation using Gemini's multimodal capabilities
- `openRouterService.ts`: OpenRouter API integration (`OpenRouterService` class)
  - Uses OpenAI SDK with OpenRouter endpoint
  - Supports 400+ models through unified API
  - JSON-mode generation for structured output
  - No image generation or search grounding support
- `firecrawlService.ts`: Deprecated, replaced by Gemini's native search

**Component Architecture**:
- `App.tsx`: Main orchestrator handling state management and generation flow
  - Manages model selection and AI service instantiation
  - Loads available models from all providers on startup
- `TopicInput.tsx`: User interface for course configuration
  - Model selection dropdown with provider identification
  - Conditional image generation toggle based on model capabilities
- `LoadingState.tsx`: Real-time progress display during generation
- `CourseDisplay.tsx`: Renders complete course with navigation
- `LessonDisplay.tsx`: Individual lesson rendering with markdown support
- `MarkdownRenderer.tsx`: Wraps react-markdown for content display

### State Management
- React hooks-based state in `App.tsx`
- LocalStorage persistence for course saving/loading
- Streaming state updates during generation process
- Progress calculation: 20% outline + 80% modules

### API Integration
**Multi-Provider Architecture**:
- **Google Gemini**: Advanced features including Google Search grounding and image generation
  - Models: `gemini-2.5-flash`, `gemini-2.5-flash-image-preview`
  - Environment variable: `GEMINI_API_KEY`
- **OpenRouter**: Access to 400+ models from various providers
  - Models: Claude, GPT-4, Llama, and many others
  - Environment variable: `OPENROUTER_API_KEY` (optional)
  - Uses OpenAI SDK with OpenRouter endpoint
- **Capability Detection**: Automatic feature detection based on selected model
  - Image generation only available for Gemini models
  - Search grounding only available for Gemini models

### Build Configuration
- **Framework**: Vite + React + TypeScript
- **Styling**: TailwindCSS (inlined styles, no separate config)
- **Dependencies**:
  - `@google/genai` for Gemini integration
  - `openai` SDK for OpenRouter integration
  - `react-markdown` for content rendering
- **Environment**: Vite handles env variable injection via `vite.config.ts`
  - `GEMINI_API_KEY` → `process.env.API_KEY` (legacy) and `process.env.GEMINI_API_KEY`
  - `OPENROUTER_API_KEY` → `process.env.OPENROUTER_API_KEY`
- **Alias**: `@/` resolves to project root

## Key Implementation Patterns

### Streaming Generation Pattern
The course generation uses async generators to provide real-time updates:
```typescript
const aiService = await createAIService(modelProvider);
const modelConfig = { provider, model: modelId, supportsImages, supportsSearch };

for await (const update of aiService.generateCourseStream(topic, images, difficulty, format, modelConfig)) {
  // Handle progress updates and course data
}
```

### Error Handling Strategy
- API errors are caught and displayed to users
- Provider-specific error handling with fallbacks
- Image generation failures don't stop course creation (Gemini only)
- LocalStorage operations include try/catch for quota issues
- Graceful degradation when optional features fail
- Model loading failures fallback to default Gemini model

### Type Safety
- All API responses validated against TypeScript interfaces
- JSON schema enforcement for Gemini API responses
- OpenRouter responses parsed and validated against Course/Module types
- Enum-based configuration prevents invalid states
- Model capability detection through TypeScript interfaces

## Development Notes

### Working with Multiple AI Providers
- **Gemini API**:
  - All prompts are carefully structured for consistent JSON output
  - Schema validation ensures type safety between API and frontend
  - Google Search grounding provides current information sources
  - Image generation is optional and happens per-lesson
- **OpenRouter API**:
  - Uses OpenAI SDK with custom base URL
  - Supports hundreds of models through unified interface
  - JSON parsing required for structured responses
  - No built-in search or image generation capabilities

### Component Development
- Components use functional React with hooks
- Styling uses TailwindCSS utility classes
- Markdown content rendered via react-markdown with GFM support
- State flows down from App.tsx, events bubble up

### Adding New Features
- Extend `types.ts` for new data structures
- Update JSON schemas in provider services for API changes
- Implement `AIService` interface for new AI providers
- Add new components following existing patterns
- Consider streaming updates for long-running operations
- Update model capability detection for new features

### Adding New AI Providers
1. Create new service class implementing `AIService` interface
2. Add provider to `ModelProvider` enum
3. Update `createAIService()` factory function
4. Add environment variable configuration in `vite.config.ts`
5. Test capability detection and graceful degradation