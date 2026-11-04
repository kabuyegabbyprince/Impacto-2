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
      <div className="w-16 h-16 inline-block">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-full h-full">
          <radialGradient id="a18" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)">
            <stop offset="0" stopColor="#26A70F"></stop>
            <stop offset=".3" stopColor="#26A70F" stopOpacity=".9"></stop>
            <stop offset=".6" stopColor="#26A70F" stopOpacity=".6"></stop>
            <stop offset=".8" stopColor="#26A70F" stopOpacity=".3"></stop>
            <stop offset="1" stopColor="#26A70F" stopOpacity="0"></stop>
          </radialGradient>
          <circle transform-origin="center" fill="none" stroke="url(#a18)" strokeWidth="15" strokeLinecap="round" strokeDasharray="200 1000" strokeDashoffset="0" cx="100" cy="100" r="70">
            <animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform>
          </circle>
          <circle transform-origin="center" fill="none" opacity=".2" stroke="#26A70F" strokeWidth="15" strokeLinecap="round" cx="100" cy="100" r="70"></circle>
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
