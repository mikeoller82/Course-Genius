import React, { useState } from 'react';
import type { Course, Lesson } from '../types';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCopyIcon,
  ImageIcon,
  RefreshIcon,
  VideoCameraIcon,
  CheckIcon,
} from './Icons';

interface CourseDisplayProps {
  course: Course;
  onReset: () => void;
}

interface LessonDisplayProps {
    lesson: Lesson;
    lessonId: string;
}

const LessonDisplay: React.FC<LessonDisplayProps> = ({ lesson, lessonId }) => {
    const [isContentOpen, setIsContentOpen] = useState(false);
    const [isScriptOpen, setIsScriptOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyScript = () => {
        if (lesson.videoScript) {
            navigator.clipboard.writeText(lesson.videoScript).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            });
        }
    };

    const renderMarkdown = (content: string) => {
        // More robust markdown handling could be added here
        return { __html: content.replace(/\n/g, '<br />') };
    };

    return (
        <div className="bg-slate-900 rounded-md border border-slate-600">
            <button
                onClick={() => setIsContentOpen(!isContentOpen)}
                className="w-full flex justify-between items-center text-left p-3 hover:bg-slate-800/80 transition-colors"
            >
                <h4 className="font-semibold text-sky-400">{lesson.title}</h4>
                {isContentOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-500" /> : <ChevronDownIcon className="w-5 h-5 text-slate-500" />}
            </button>
            {isContentOpen && (
                <div className="p-4 border-t border-slate-700 space-y-6">
                    {lesson.imageBase64 && (
                        <div className="my-4">
                            <h5 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2"><ImageIcon /> Visual Aid</h5>
                            <img
                                src={`data:image/jpeg;base64,${lesson.imageBase64}`}
                                alt={lesson.imagePrompt || `Visual for ${lesson.title}`}
                                className="rounded-lg w-full max-w-md mx-auto shadow-lg border border-slate-600"
                            />
                        </div>
                    )}
                    <div>
                        <h5 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2"><BookOpenIcon /> Lesson Content</h5>
                        <div className="prose prose-invert prose-slate text-slate-300 max-w-none" dangerouslySetInnerHTML={renderMarkdown(lesson.content)} />
                    </div>
                    {lesson.videoScript && (
                         <div className="border-t border-slate-700 pt-4">
                            <button
                                onClick={() => setIsScriptOpen(!isScriptOpen)}
                                className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-sky-400 transition-colors"
                            >
                                <VideoCameraIcon />
                                {isScriptOpen ? 'Hide' : 'View'} Video Script
                                {isScriptOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                            </button>
                            {isScriptOpen && (
                                <div className="mt-3 relative bg-slate-900/70 p-4 rounded-md text-sm">
                                    <button
                                        onClick={handleCopyScript}
                                        className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all"
                                        aria-label="Copy script"
                                    >
                                        {copySuccess ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardCopyIcon className="w-4 h-4" />}
                                    </button>
                                    <div
                                        className="prose prose-invert prose-slate text-slate-300 max-w-none"
                                        dangerouslySetInnerHTML={renderMarkdown(lesson.videoScript)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const CourseDisplay: React.FC<CourseDisplayProps> = ({ course, onReset }) => {
  const [openModules, setOpenModules] = useState<{ [key: string]: boolean }>({});

  const toggleModule = (id: string) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-400 to-emerald-400 text-transparent bg-clip-text mb-2">
          {course.title}
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">{course.description}</p>
        <button
            onClick={onReset}
            className="mt-6 flex items-center justify-center gap-2 mx-auto px-6 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-200"
        >
            <RefreshIcon className="w-5 h-5" />
            Create New Course
        </button>
      </header>

      <div className="space-y-6">
        <div>
            <h2 className="text-2xl font-bold text-sky-400 mb-4 border-b-2 border-slate-700 pb-2">Learning Objectives</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-300 pl-4">
                {course.learningObjectives.map((obj, i) => <li key={i}>{obj}</li>)}
            </ul>
        </div>

        <div>
            <h2 className="text-2xl font-bold text-sky-400 mb-4 border-b-2 border-slate-700 pb-2">Course Modules</h2>
            <div className="space-y-4">
                {course.modules.map((module, moduleIndex) => (
                    <div key={moduleIndex} className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
                        <button
                            onClick={() => toggleModule(`module-${moduleIndex}`)}
                            className="w-full flex justify-between items-center text-left p-4 hover:bg-slate-800/60 transition-colors"
                        >
                            <div className="flex flex-col">
                                <h3 className="text-xl font-semibold text-slate-100">{module.title}</h3>
                                <p className="text-sm text-slate-400 mt-1">{module.description}</p>
                            </div>
                            {openModules[`module-${moduleIndex}`] ? <ChevronUpIcon className="w-6 h-6 text-slate-400" /> : <ChevronDownIcon className="w-6 h-6 text-slate-400" />}
                        </button>
                        {openModules[`module-${moduleIndex}`] && (
                            <div className="bg-slate-800/50 p-4 border-t border-slate-700">
                                <div className="space-y-3">
                                    {module.lessons.map((lesson, lessonIndex) => (
                                        <LessonDisplay
                                            key={lessonIndex}
                                            lesson={lesson}
                                            lessonId={`lesson-${moduleIndex}-${lessonIndex}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDisplay;