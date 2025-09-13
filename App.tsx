
import React, { useState, useCallback, useEffect } from 'react';
import type { Course, CourseOutline, Module } from './types';
import { Difficulty } from './types';
import { generateCourseStream } from './services/geminiService';
import TopicInput from './components/TopicInput';
import LoadingState from './components/LoadingState';
import CourseDisplay from './components/CourseDisplay';
import { LogoIcon } from './components/Icons';

interface LogEntry {
  message: string;
  isCompleted: boolean;
}

const LOCAL_STORAGE_KEY = 'ai-course-generator-saved-course';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [includeImages, setIncludeImages] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Beginner);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationLog, setGenerationLog] = useState<LogEntry[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCourseExists, setSavedCourseExists] = useState<boolean>(false);

  // State for progress calculation
  const [totalModules, setTotalModules] = useState(0);
  const [completedModules, setCompletedModules] = useState(0);
  const [outlineComplete, setOutlineComplete] = useState(false);

  useEffect(() => {
    try {
      const savedCourse = localStorage.getItem(LOCAL_STORAGE_KEY);
      setSavedCourseExists(!!savedCourse);
    } catch (e) {
      console.error("Could not access local storage", e);
      setSavedCourseExists(false);
    }
  }, []);

  const handleGenerateCourse = useCallback(async (newTopic: string, generateImages: boolean, newDifficulty: Difficulty) => {
    if (!newTopic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    
    setTopic(newTopic);
    setIncludeImages(generateImages);
    setDifficulty(newDifficulty);
    setIsGenerating(true);
    setCourse(null);
    setError(null);
    setGenerationLog([]);

    // Reset progress state
    setTotalModules(0);
    setCompletedModules(0);
    setOutlineComplete(false);

    const tempCourse: Partial<Course> = {};
    const tempModules: Module[] = [];

    try {
        const log: LogEntry[] = [];
        let currentLogIndex = -1;

        for await (const update of generateCourseStream(newTopic, generateImages, newDifficulty)) {
            if (update.step === "OUTLINING") {
                if (update.payload) { // Outline is done
                    log[currentLogIndex].isCompleted = true;
                    const outline = update.payload as CourseOutline;
                    setOutlineComplete(true);
                    setTotalModules(outline.moduleTitles.length);
                    Object.assign(tempCourse, { ...outline });
                } else { // Outline is starting
                    log.push({ message: update.message, isCompleted: false });
                    currentLogIndex++;
                }
            } else if (update.step === "GENERATING_MODULES") {
                 if (update.payload) { // Module is done
                    log[currentLogIndex].isCompleted = true;
                    setCompletedModules(prev => prev + 1);
                    tempModules.push(update.payload as Module);
                } else { // New module is starting
                    log.push({ message: update.message, isCompleted: false });
                    currentLogIndex++;
                }
            } else if (update.step === "GENERATING_IMAGES") {
                // This step is for messaging only, it updates the current log entry
                // before the module is marked as complete.
                if (log[currentLogIndex]) {
                  log[currentLogIndex].message = update.message;
                }
            }
            setGenerationLog([...log]);
        }
        tempCourse.modules = tempModules;
        setCourse(tempCourse as Course);

    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        setGenerationLog(prev => {
            if (prev.length > 0) {
                const lastLog = prev[prev.length - 1];
                lastLog.isCompleted = false; 
                lastLog.message = `Error: ${errorMessage.substring(0, 100)}...`;
            }
            return [...prev];
        });
    } finally {
        setIsGenerating(false);
    }
  }, []);

  const handleReset = () => {
    setTopic('');
    setCourse(null);
    setError(null);
    setIsGenerating(false);
    setGenerationLog([]);
  };

  const handleSaveCourse = () => {
    if (course) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(course));
            setSavedCourseExists(true);
        } catch (e) {
            console.error("Failed to save course to local storage", e);
            setError("Could not save the course. Storage might be full.");
        }
    }
  };

  const handleLoadCourse = () => {
    try {
        const savedCourseJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedCourseJSON) {
            const savedCourse = JSON.parse(savedCourseJSON);
            setCourse(savedCourse);
            setError(null);
            setIsGenerating(false);
        }
    } catch (e) {
        console.error("Failed to load or parse course from storage", e);
        setError("Failed to load course. It might be corrupted.");
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setSavedCourseExists(false);
    }
  };


  const renderContent = () => {
    if (isGenerating) {
      // Give outlining 10% of the progress, and the rest to modules
      const progress = totalModules > 0
        ? ((outlineComplete ? 0.1 : 0) + (completedModules / totalModules) * 0.9) * 100
        : 0;
      return <LoadingState log={generationLog} progress={progress} />;
    }
    if (course) {
      return <CourseDisplay course={course} onReset={handleReset} onSave={handleSaveCourse} />;
    }
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 text-transparent bg-clip-text mb-2">
            AI Course Generator
          </h1>
          <p className="text-lg text-slate-400">
            Turn any topic into a comprehensive, ready-to-use course in minutes.
          </p>
        </div>
        <TopicInput 
          onSubmit={handleGenerateCourse} 
          disabled={isGenerating} 
          includeImages={includeImages}
          setIncludeImages={setIncludeImages}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          onLoadCourse={handleLoadCourse}
          savedCourseExists={savedCourseExists}
        />
        {error && !isGenerating && <p className="text-red-400 text-center mt-4">{error}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <LogoIcon />
        <span className="font-semibold text-xl">CourseGenius</span>
      </div>
      <main className="w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="w-full text-center p-4 text-slate-500 text-sm mt-8">
        Powered by Google Gemini
      </footer>
    </div>
  );
};

export default App;
