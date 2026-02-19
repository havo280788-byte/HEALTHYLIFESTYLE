import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative">
        <input
          className={`
            w-full px-4 py-3 pl-11 rounded-xl border border-slate-200 
            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
            outline-none transition-all duration-200 text-slate-800
            placeholder:text-slate-400
            ${className}
          `}
          {...props}
        />
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default Input;
