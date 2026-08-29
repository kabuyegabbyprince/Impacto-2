import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Impacto Green Color: #15803D -> %2315803D
const spinnerDataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><radialGradient id="a18" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="%2315803D"></stop><stop offset=".3" stop-color="%2315803D" stop-opacity=".9"></stop><stop offset=".6" stop-color="%2315803D" stop-opacity=".6"></stop><stop offset=".8" stop-color="%2315803D" stop-opacity=".3"></stop><stop offset="1" stop-color="%2315803D" stop-opacity="0"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(%23a18)" stroke-width="15" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="%2315803D" stroke-width="15" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>';

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <img
      src={spinnerDataUrl}
      alt="Loading..."
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};
