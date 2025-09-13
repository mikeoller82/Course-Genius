
import React from 'react';
import { CheckIcon, SpinnerIcon, DocumentIcon } from './Icons';

interface LogEntry {
  message: string;
  isCompleted: boolean;
}

interface LoadingStateProps {
  log: LogEntry[];
  progress: number;
}

const LoadingState: React.FC<LoadingStateProps> = ({ log, progress }) => {
    return (
        <div className="w-full max-w-lg mx-auto bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-bold text-center text-sky-400 mb-6">Building Your Course</h2>
            
            <div className="mb-6">
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                        className="bg-gradient-to-r from-sky-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="text-center text-sm text-slate-400 mt-2 font-medium" aria-live="polite">
                    {Math.round(progress)}% Complete
                </p>
            </div>

            <div className="space-y-4">
                {log.map((entry, index) => {
                    const isActive = !entry.isCompleted;
                    return (
                        <div key={index} className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg transition-all duration-300">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                                ${entry.isCompleted ? 'bg-emerald-500' : ''}
                                ${isActive ? 'bg-sky-600' : 'bg-slate-700'}
                            `}>
                                {entry.isCompleted ? <CheckIcon className="h-5 w-5 text-slate-900" /> : (isActive ? <SpinnerIcon /> : <DocumentIcon />)}
                            </div>
                            <span className={`font-medium
                                ${entry.isCompleted ? 'text-emerald-400' : ''}
                                ${isActive ? 'text-sky-400 animate-pulse-fast' : 'text-slate-400'}
                            `}>
                                {entry.message}
                            </span>
                        </div>
                    );
                })}
                 {log.length === 0 && (
                    <div className="flex items-center justify-center p-4">
                        <SpinnerIcon />
                        <span className="ml-4 text-slate-400 animate-pulse-fast">Initializing generation...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadingState;
