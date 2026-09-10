/**
 * Centralized Application & Deployment Configuration
 * 
 * You can customize these variables directly in this file, or override them
 * dynamically during deployment via standard environment variables (.env / Vercel / Cloud Run).
 */

const getEnv = (key: string, defaultValue: string = ""): string => {
  // Check browser runtime injection if available
  const win = typeof window !== "undefined" ? (window as any) : {};
  if (win.__RUNTIME_ENV__ && win.__RUNTIME_ENV__[key]) {
    return win.__RUNTIME_ENV__[key];
  }
  // Check process.env (Node / SSR)
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // Check Vite client-side import.meta.env
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch {
    // Ignore error
  }
  return defaultValue;
};

export const APP_CONFIG = {
  // Platform & Branding
  appName: getEnv("VITE_APP_NAME", "Impact-O"),
  appDescription: getEnv("VITE_APP_DESC", "The Operating System for Agricultural Cooperatives & Informal Groups"),
  supportEmail: getEnv("VITE_SUPPORT_EMAIL", "support@impacto.org"),
  
  // Public Deployment Domains & URLs
  landingUrl: getEnv("VITE_LANDING_URL", "https://impacto-landing.vercel.app/"),
  portalUrl: getEnv("VITE_PORTAL_URL", "https://impacto-portal.vercel.app/"),
  homeUrl: getEnv("VITE_HOME_URL", "https://impacto-landing.vercel.app/"),
  
  // Supabase Backend Database Credentials
  supabase: {
    url: getEnv("VITE_SUPABASE_URL", "https://jyluwvwghtirdmazhhym.supabase.co"),
    anonKey: getEnv("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHV3dndnaHRpcmRtYXpoaHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjM5MjYsImV4cCI6MjA5NTAzOTkyNn0.KcV_8RXSnoNVObFqgeLm-9r3fBbRf7FSEM6woVjhG3Q"),
    projectId: getEnv("VITE_SUPABASE_PROJECT_ID", "jyluwvwghtirdmazhhym"),
  },

  // Payment Gateways
  payments: {
    pawapayEnabled: true,
    stripeEnabled: false,
    momoCurrency: "RWF",
  },

  // Navigation Links
  links: {
    privacyPolicy: getEnv("VITE_PRIVACY_URL", "https://impacto-landing.vercel.app/privacy"),
    termsOfService: getEnv("VITE_TERMS_URL", "https://impacto-landing.vercel.app/terms"),
    documentation: getEnv("VITE_DOCS_URL", "https://impacto-landing.vercel.app/docs"),
  }
};

export default APP_CONFIG;
