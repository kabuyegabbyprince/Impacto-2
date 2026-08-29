import React from "react";

interface LogoLoaderProps {
  message?: string;
  subMessage?: string;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({
  message,
  subMessage
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 select-none font-sans text-center min-h-[300px]">
      <div className="relative w-16 h-16 inline-block text-emerald-600 dark:text-emerald-500">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-full h-full">
          <circle fill="currentColor" stroke="currentColor" strokeWidth="15" r="15" cx="35" cy="100">
            <animate attributeName="cx" calcMode="spline" dur="2" values="35;165;165;35;35" keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1" repeatCount="indefinite" begin="0"></animate>
          </circle>
          <circle fill="currentColor" stroke="currentColor" strokeWidth="15" opacity=".8" r="15" cx="35" cy="100">
            <animate attributeName="cx" calcMode="spline" dur="2" values="35;165;165;35;35" keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1" repeatCount="indefinite" begin="0.05"></animate>
          </circle>
          <circle fill="currentColor" stroke="currentColor" strokeWidth="15" opacity=".6" r="15" cx="35" cy="100">
            <animate attributeName="cx" calcMode="spline" dur="2" values="35;165;165;35;35" keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1" repeatCount="indefinite" begin=".1"></animate>
          </circle>
          <circle fill="currentColor" stroke="currentColor" strokeWidth="15" opacity=".4" r="15" cx="35" cy="100">
            <animate attributeName="cx" calcMode="spline" dur="2" values="35;165;165;35;35" keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1" repeatCount="indefinite" begin=".15"></animate>
          </circle>
          <circle fill="currentColor" stroke="currentColor" strokeWidth="15" opacity=".2" r="15" cx="35" cy="100">
            <animate attributeName="cx" calcMode="spline" dur="2" values="35;165;165;35;35" keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1" repeatCount="indefinite" begin=".2"></animate>
          </circle>
        </svg>
      </div>
      
      {(message || subMessage) && (
        <div className="mt-6 flex flex-col items-center gap-1.5 max-w-xs">
          {message && (
            <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 font-display">
              {message}
            </h4>
          )}
          {subMessage && (
            <p className="text-xs text-gray-400 font-medium select-none mt-1">
              {subMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
