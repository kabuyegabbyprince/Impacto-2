import { create } from "zustand";
import i18n from "../lib/i18n";
import { User } from "../types";

export type { User };

export interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUserLanguage: (lang: "en" | "fr" | "rw") => void;
  updateAccessibilityPreferences: (prefs: {
    fontSize?: "normal" | "large" | "x-large";
    highContrast?: boolean;
  }) => void;
  setSession: (session: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

// Apply accessibility styling classes/attributes to the document element
const applyAccessibilitySettings = (user?: User | null) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  
  if (user?.accessibility_high_contrast) {
    root.classList.add("a11y-high-contrast");
    root.setAttribute("data-a11y-contrast", "high");
  } else {
    root.classList.remove("a11y-high-contrast");
    root.removeAttribute("data-a11y-contrast");
  }

  if (user?.accessibility_font_size) {
    root.setAttribute("data-a11y-font-size", user.accessibility_font_size);
  } else {
    root.removeAttribute("data-a11y-font-size");
  }
};

// Check local storage for persistent demo/mock session
const getInitialUser = (): User | null => {
  const saved = localStorage.getItem("impacto_user");
  if (saved) {
    try {
      const parsed: User = JSON.parse(saved);
      // If user had a personal language saved, ensure it takes priority
      const userLang = localStorage.getItem("impacto_user_lang_" + parsed.id) as ("en" | "fr" | "rw") || parsed.preferred_language;
      if (userLang) {
        parsed.preferred_language = userLang;
        try {
          i18n.changeLanguage(userLang);
          localStorage.setItem("i18nextLng", userLang);
        } catch {}
      }
      applyAccessibilitySettings(parsed);
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getInitialUser(),
  session: localStorage.getItem("impacto_session") ? {} : null,
  isLoading: false,
  setUser: (user) => {
    if (user) {
      // Respect user's scoped language without interfering with organization defaults or other users
      const userLang = (localStorage.getItem("impacto_user_lang_" + user.id) as ("en" | "fr" | "rw")) || user.preferred_language;
      if (userLang) {
        user.preferred_language = userLang;
        try {
          i18n.changeLanguage(userLang);
          localStorage.setItem("i18nextLng", userLang);
          localStorage.setItem("impacto_user_lang_" + user.id, userLang);
        } catch {}
      }
      applyAccessibilitySettings(user);

      try {
        localStorage.setItem("impacto_user", JSON.stringify(user));
      } catch (err) {
        console.warn("Failed to save user to localStorage:", err);
      }
    } else {
      try {
        localStorage.removeItem("impacto_user");
      } catch {}
      applyAccessibilitySettings(null);
    }
    set({ user });
  },
  updateUserLanguage: (lang: "en" | "fr" | "rw") => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        preferred_language: lang,
      };
      try {
        localStorage.setItem("impacto_user", JSON.stringify(updatedUser));
        localStorage.setItem("impacto_user_lang_" + currentUser.id, lang);
        localStorage.setItem("i18nextLng", lang);

        // Also update the MockDB users collection if present
        const mockUsersStr = localStorage.getItem("impacto_mock_users");
        if (mockUsersStr) {
          const users = JSON.parse(mockUsersStr);
          const found = users.find((u: any) => u.id === currentUser.id);
          if (found) {
            found.preferred_language = lang;
            localStorage.setItem("impacto_mock_users", JSON.stringify(users));
          }
        }
      } catch (err) {
        console.warn("Failed to persist user language:", err);
      }

      try {
        i18n.changeLanguage(lang);
      } catch (e) {
        console.warn("Failed to change i18n language:", e);
      }

      set({ user: updatedUser });
    } else {
      // Guest / unauthenticated session
      try {
        i18n.changeLanguage(lang);
        localStorage.setItem("i18nextLng", lang);
      } catch {}
    }
  },
  updateAccessibilityPreferences: (prefs) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      accessibility_font_size: prefs.fontSize !== undefined ? prefs.fontSize : currentUser.accessibility_font_size,
      accessibility_high_contrast: prefs.highContrast !== undefined ? prefs.highContrast : currentUser.accessibility_high_contrast,
    };

    try {
      localStorage.setItem("impacto_user", JSON.stringify(updatedUser));
      const mockUsersStr = localStorage.getItem("impacto_mock_users");
      if (mockUsersStr) {
        const users = JSON.parse(mockUsersStr);
        const found = users.find((u: any) => u.id === currentUser.id);
        if (found) {
          found.accessibility_font_size = updatedUser.accessibility_font_size;
          found.accessibility_high_contrast = updatedUser.accessibility_high_contrast;
          localStorage.setItem("impacto_mock_users", JSON.stringify(users));
        }
      }
    } catch {}

    applyAccessibilitySettings(updatedUser);
    set({ user: updatedUser });
  },
  setSession: (session) => {
    if (session) {
      try {
        localStorage.setItem("impacto_session", "true");
      } catch (err) {
        console.warn("Failed to save session to localStorage:", err);
      }
    } else {
      try {
        localStorage.removeItem("impacto_session");
      } catch {}
    }
    set({ session });
  },
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    try {
      localStorage.removeItem("impacto_user");
      localStorage.removeItem("impacto_session");
      localStorage.removeItem("impacto_active_org");
      localStorage.removeItem("impacto_active_member");
    } catch {}
    applyAccessibilitySettings(null);
    set({ user: null, session: null, isLoading: false });
  },
}));
