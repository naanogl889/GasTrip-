
import React from 'react';

interface ResultCardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ label, value, unit, color }) => {
  const isDarkCard = color.includes('indigo-600') || color.includes('indigo-500');
  const isLarge = label.includes('TOTAL');
  
  return (
    <div className={`p-8 rounded-[2rem] ${color} flex flex-col shadow-lg transition-all hover:scale-[1.01] duration-300`}>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDarkCard ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={`${isLarge ? 'text-5xl sm:text-6xl' : 'text-4xl'} font-black tabular-nums tracking-tight ${isDarkCard ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {value}
        </span>
        <span className={`text-lg font-bold ${isDarkCard ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
          {unit}
        </span>
      </div>
    </div>
  );
};
