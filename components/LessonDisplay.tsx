import React, { useState } from 'react';
// FIX: Removed unused 'Course' type as this component only deals with a single Lesson.
import type { Lesson } from '../types';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCopyIcon,
  ImageIcon,
  // FIX: Removed unused 'RefreshIcon' which is only used in CourseDisplay.
  VideoCameraIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from './Icons';

// FIX: This file has been refactored to be a standalone component file for LessonDisplay,
// which resolves the error caused by a duplicate and incomplete CourseDisplay component definition.
interface LessonDisplayProps {
    lesson: Lesson;
    lessonId: string;
    isOpen: boolean;
    onToggle: () => void;
    onNavigatePrev: () => void;
    onNavigateNext: () => void;
    isFirst: boolean;
    isLast: boolean;
}

const LessonDisplay: React.FC<LessonDisplayProps> = ({ lesson, isOpen, onToggle, onNavigatePrev, onNavigateNext, isFirst, isLast }) => {
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
                onClick={onToggle}
                className="w-full flex justify-between items-center text-left p-3 hover:bg-slate-800/80 transition-colors"
                aria-expanded={isOpen}
            >
                <h4 className="font-semibold text-sky-400">{lesson.title}</h4>
                {isOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-500" /> : <ChevronDownIcon className="w-5 h-5 text-slate-500" />}
            </button>
            {isOpen && (
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
                                aria-expanded={isScriptOpen}
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
                    <div className="flex justify-between items-center border-t border-slate-700 pt-4 mt-4">
                        <button
                            onClick={onNavigatePrev}
                            disabled={isFirst}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4"/>
                            Previous<span className="hidden sm:inline">&nbsp;Lesson</span>
                        </button>
                        <button
                            onClick={onNavigateNext}
                            disabled={isLast}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Next<span className="hidden sm:inline">&nbsp;Lesson</span>
                            <ArrowRightIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonDisplay;
