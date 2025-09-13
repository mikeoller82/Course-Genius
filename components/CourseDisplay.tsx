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
  ArrowLeftIcon,
  ArrowRightIcon,
  SaveIcon,
  ExportIcon,
} from './Icons';
// FIX: Import LessonDisplay from its own file to follow component-based architecture best practices.
import LessonDisplay from './LessonDisplay';

interface CourseDisplayProps {
  course: Course;
  onReset: () => void;
  onSave: () => void;
}

const formatCourseForExport = (course: Course): string => {
    // A more readable, markdown-style format for the exported text file.
    let content = `# COURSE: ${course.title}\n\n`;
    
    content += `## DESCRIPTION\n`;
    content += `${course.description}\n\n`;
    
    content += `## LEARNING OBJECTIVES\n`;
    course.learningObjectives.forEach(obj => {
        content += `* ${obj}\n`;
    });
    content += `\n`;

    course.modules.forEach((module, moduleIndex) => {
        // Use a clear separator for each module
        content += `\n---\n\n`;
        content += `# MODULE ${moduleIndex + 1}: ${module.title}\n\n`;
        content += `**Module Description:** ${module.description}\n\n`;

        module.lessons.forEach((lesson, lessonIndex) => {
            content += `### Lesson ${moduleIndex + 1}.${lessonIndex + 1}: ${lesson.title}\n\n`;
            
            content += `#### CONTENT\n`;
            // The content from Gemini is already markdown-formatted.
            content += `${lesson.content}\n\n`;
            
            if (lesson.videoScript) {
                content += `#### VIDEO SCRIPT\n`;
                content += `${lesson.videoScript}\n\n`;
            }
        });
    });

    return content;
};


// FIX: Removed the in-file LessonDisplay component and its props interface. It is now imported from its dedicated file.
const CourseDisplay: React.FC<CourseDisplayProps> = ({ course, onReset, onSave }) => {
  const [openModules, setOpenModules] = useState<{ [key: string]: boolean }>({});
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>({});
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const toggleModule = (id: string) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const toggleLesson = (id: string) => {
    setOpenLessons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLessonNavigation = (moduleIndex: number, currentLessonIndex: number, direction: 'prev' | 'next') => {
    const nextLessonIndex = direction === 'next' ? currentLessonIndex + 1 : currentLessonIndex - 1;
    
    if (nextLessonIndex < 0 || nextLessonIndex >= course.modules[moduleIndex].lessons.length) {
        return;
    }

    const currentLessonId = `lesson-${moduleIndex}-${currentLessonIndex}`;
    const nextLessonId = `lesson-${moduleIndex}-${nextLessonIndex}`;

    setOpenLessons(prev => ({
        ...prev,
        [currentLessonId]: false,
        [nextLessonId]: true,
    }));
  };

  const handleSave = () => {
      onSave();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
  };

  const handleExport = () => {
    const courseContent = formatCourseForExport(course);
    const blob = new Blob([courseContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeFilename = course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeFilename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-400 to-emerald-400 text-transparent bg-clip-text mb-2">
          {course.title}
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">{course.description}</p>
        <div className="mt-6 flex items-center justify-center flex-wrap gap-4">
            <button
                onClick={onReset}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-200"
            >
                <RefreshIcon className="w-5 h-5" />
                Create New Course
            </button>
             <button
                onClick={handleSave}
                disabled={isSaved}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-200 disabled:bg-emerald-600 disabled:text-white"
            >
                {isSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
                {isSaved ? 'Saved!' : 'Save Course'}
            </button>
            <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-200"
            >
                <ExportIcon className="w-5 h-5" />
                Export as .txt
            </button>
        </div>
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
                                    {module.lessons.map((lesson, lessonIndex) => {
                                        const lessonId = `lesson-${moduleIndex}-${lessonIndex}`;
                                        const isFirst = lessonIndex === 0;
                                        const isLast = lessonIndex === module.lessons.length - 1;
                                        return (
                                            <LessonDisplay
                                                key={lessonIndex}
                                                lesson={lesson}
                                                lessonId={lessonId}
                                                isOpen={!!openLessons[lessonId]}
                                                onToggle={() => toggleLesson(lessonId)}
                                                onNavigatePrev={() => handleLessonNavigation(moduleIndex, lessonIndex, 'prev')}
                                                onNavigateNext={() => handleLessonNavigation(moduleIndex, lessonIndex, 'next')}
                                                isFirst={isFirst}
                                                isLast={isLast}
                                            />
                                        );
                                    })}
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