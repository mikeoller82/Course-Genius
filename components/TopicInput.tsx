
import React, { useState } from 'react';
import { SparklesIcon } from './Icons';

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  disabled: boolean;
}

const TopicInput: React.FC<TopicInputProps> = ({ onSubmit, disabled }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !disabled) {
      onSubmit(topic);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-4">
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g., 'The History of Ancient Rome' or 'Introduction to Quantum Computing'"
        className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-200 resize-none text-base text-slate-200 placeholder-slate-500"
        rows={3}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !topic.trim()}
        className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100"
      >
        <SparklesIcon />
        Generate Course
      </button>
    </form>
  );
};

export default TopicInput;
