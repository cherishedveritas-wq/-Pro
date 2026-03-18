import React from 'react';
import { HelpCircle } from 'lucide-react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  tooltip?: string;
  suffix?: string;
  prefix?: string;
};

export function Input({ label, tooltip, suffix, prefix, className = '', ...props }: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {tooltip && (
          <div className="group relative flex items-center">
            <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-slate-500 text-sm">{prefix}</span>
        )}
        <input
          {...props}
          className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow
            ${prefix ? 'pl-8' : ''}
            ${suffix ? 'pr-8' : ''}
          `}
        />
        {suffix && (
          <span className="absolute right-3 text-slate-500 text-sm">{suffix}</span>
        )}
      </div>
    </div>
  );
}
