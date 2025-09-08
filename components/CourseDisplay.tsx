
import React, { useState } from 'react';
import type { Course, Module, Lesson } from '../types';
import { BookOpenIcon, ChevronDownIcon, ClipboardCheckIcon, RefreshIcon, VideoCameraIcon, ClipboardCopyIcon, CheckIcon } from './Icons';

// Advanced markdown to HTML converter
const renderMarkdown = (markdown: string) => {
  if (!markdown) return '';

  let html = markdown
    // Sanitize basic HTML to prevent injection
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // --- Block Elements (order is important) ---

  // 1. Fenced Code Blocks
  html = html.replace(/```(\w*)\n([\s\S]+?)\n```/g,
    (match, lang, code) => `\n\n<pre class="bg-slate-950 p-4 rounded-md overflow-x-auto"><code class="font-mono text-sm text-sky-300 language-${lang}">${code.trim()}</code></pre>\n\n`
  );

  // 2. Tables
  html = html.replace(/^\|(.+)\|\r?\n\|( *[-:]+ *\|)+\r?\n((?:\|.*\|(?:\r?\n|$))*)/gm, table => {
      const rows = table.trim().split('\n');
      const header = `<thead class="bg-slate-800"><tr class="border-b border-slate-700">${rows[0].slice(1, -1).split('|').map(h => `<th class="p-3 text-left font-semibold">${h.trim()}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${rows.slice(2).map(row => `<tr class="border-b border-slate-800 last:border-b-0">${row.slice(1, -1).split('|').map(c => `<td class="p-3">${c.trim()}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `\n\n<div class="table-wrapper my-6 overflow-x-auto border border-slate-700 rounded-lg"><table class="w-full text-sm">${header}${body}</table></div>\n\n`;
  });

  // 3. Blockquotes
  html = html.replace(/^(> .+\r?\n?)+/gm, match =>
    `\n\n<blockquote class="border-l-4 border-sky-500 pl-4 my-4 italic text-slate-400">${match.replace(/^> /gm, '').trim().replace(/\n/g, '<br/>')}</blockquote>\n\n`
  );

  // 4. Unordered Lists
  html = html.replace(/^((\* .+(\n|$))+)/gm, (match) => {
      const items = match.trim().split('\n').map(item => `<li>${item.replace(/^\* /, '')}</li>`).join('');
      return `\n\n<ul class="list-disc list-inside space-y-2 my-4 pl-4">${items}</ul>\n\n`;
  });

  // 5. Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 mt-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 mt-6">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 mt-8">$1</h1>');

  // --- Inline Elements ---
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-700 text-sky-300 rounded px-1.5 py-0.5 text-sm font-mono">$1</code>');

  // --- Paragraphs ---
  // Wrap remaining text blocks in <p> tags
  html = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // If it's already an HTML block, leave it alone.
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return html;
};

interface LessonDisplayProps {
  lesson: Lesson;
}

const LessonDisplay: React.FC<LessonDisplayProps> = ({ lesson }) => {
    const [showScript, setShowScript] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyScript = () => {
        if (!lesson.videoScript) return;
        navigator.clipboard.writeText(lesson.videoScript).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <div className="p-4 bg-slate-900 rounded-md">
            <h4 className="font-semibold text-sky-300 mb-2">{lesson.title}</h4>
            {lesson.imageBase64 && (
                <div className="my-4">
                    <img
                        src={`data:image/jpeg;base64,${lesson.imageBase64}`}
                        alt={`AI-generated image for ${lesson.title}`}
                        className="w-full h-auto rounded-lg border border-slate-700 shadow-lg"
                    />
                </div>
            )}
            <div 
              className="prose prose-invert prose-sm max-w-none text-slate-300 space-y-4" 
              dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content) }} 
            />
            {lesson.videoScript && (
                <div className="mt-4">
                    <button
                        onClick={() => setShowScript(!showScript)}
                        className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors"
                    >
                        <VideoCameraIcon className="h-5 w-5" />
                        <span>{showScript ? 'Hide Video Script' : 'View Video Script'}</span>
                    </button>
                    {showScript && (
                        <div className="mt-3 p-4 bg-slate-950/70 rounded-lg border border-slate-700 relative animate-[fadeIn_0.3s_ease-out]">
                            <button
                                onClick={handleCopyScript}
                                className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-200
                                    ${copied 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }
                                `}
                                disabled={copied}
                            >
                                {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardCopyIcon className="h-4 w-4" />}
                                {copied ? 'Copied' : 'Copy Script'}
                            </button>
                            <h5 className="text-sm font-semibold text-slate-200 mb-2">Video Script</h5>
                            <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono max-h-96 overflow-y-auto pr-4">
                                {lesson.videoScript}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


interface ModuleAccordionProps {
  module: Module;
  index: number;
}

const ModuleAccordion: React.FC<ModuleAccordionProps> = ({ module, index }) => {
  const [isOpen, setIsOpen] = useState(index === 0);

  return (
    <div className="border border-slate-700 bg-slate-800/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
            <span className="text-sky-400 font-bold">Module {index + 1}</span>
            <h3 className="text-lg font-semibold text-slate-100">{module.title}</h3>
        </div>
        <ChevronDownIcon className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-700">
          <p className="text-slate-400 mb-6">{module.description}</p>
          <div className="space-y-4">
            {module.lessons.map((lesson, lessonIndex) => (
              <LessonDisplay key={lessonIndex} lesson={lesson} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


interface CourseDisplayProps {
  course: Course;
  onReset: () => void;
}

const CourseDisplay: React.FC<CourseDisplayProps> = ({ course, onReset }) => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 sm:p-8 animate-[fadeIn_0.5s_ease-out]">
      <header className="mb-8 pb-6 border-b border-slate-700">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 text-transparent bg-clip-text mb-2">{course.title}</h1>
        <p className="text-slate-300">{course.description}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-slate-200">
          <ClipboardCheckIcon />
          Learning Objectives
        </h2>
        <ul className="list-disc list-inside space-y-2 text-slate-300 pl-2">
          {course.learningObjectives.map((obj, index) => (
            <li key={index}>{obj}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-slate-200">
          <BookOpenIcon />
          Course Curriculum
        </h2>
        <div className="space-y-4">
          {course.modules.map((module, index) => (
            <ModuleAccordion key={index} module={module} index={index} />
          ))}
        </div>
      </section>

      <div className="mt-10 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-500 transition-colors duration-200"
        >
          <RefreshIcon />
          Create Another Course
        </button>
      </div>
    </div>
  );
};

export default CourseDisplay;
