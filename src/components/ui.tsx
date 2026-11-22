import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Eye, EyeOff, X, UploadCloud } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { uploadFileToSupabase, resolveFileUrl, fileToDataURL } from "../lib/storageService";
import { isSupabaseConfigured } from "../lib/supabase";
import { Spinner } from "./Spinner";

export const getLucideIcon = (iconName: string): React.ComponentType<any> | null => {
  if (!iconName) return null;
  // Normalize names: e.g. "graduation-cap" -> "GraduationCap", "user" -> "User"
  const normalized = iconName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return (LucideIcons as any)[normalized] || null;
};

// ==========================================
// 1. BUTTON COMPONENT
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#156c45] text-xs md:text-sm cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed min-w-0 max-w-full text-center leading-snug";

  const variants = {
    primary: "bg-[#156c45] hover:bg-[#105536] text-white shadow-3xs hover:shadow-xs",
    secondary: "bg-[var(--brand-amber)] hover:bg-amber-600 text-white shadow-3xs",
    outline: "border border-slate-200/90 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 shadow-3xs",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-3xs focus:ring-rose-500"
  };

  const sizes = {
    xs: "px-2.5 py-1 gap-1 text-[11px] min-h-[28px]",
    sm: "px-3 py-1.5 gap-1.5 text-xs min-h-[34px]",
    md: "px-4 py-2 gap-2 text-xs md:text-sm min-h-[38px]",
    lg: "px-5 py-2.5 gap-2 text-sm md:text-base min-h-[44px]"
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon ? <span className="shrink-0 flex items-center">{icon}</span> : null}
      {children}
    </button>
  );
};

// ==========================================
// 2. INPUT COMPONENT
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const ImageUploadInput: React.FC<{
  label?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [resolvedUrl, setResolvedUrl] = React.useState("");
  const [fileNotice, setFileNotice] = React.useState<{ type: "error" | "warning"; text: string } | null>(null);

  React.useEffect(() => {
    if (!value) {
      setResolvedUrl("");
      return;
    }
    let active = true;
    resolveFileUrl(value).then((url) => {
      if (active) setResolvedUrl(url);
    });
    return () => {
      active = false;
    };
  }, [value]);
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setFileNotice(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setFileNotice({
          type: "error",
          text: t("ui.file_too_large", "File too large. Maximum size is 50MB.")
        });
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        setFileNotice({
          type: "warning",
          text: t("ui.file_large_warning", "Warning: File is large (>30MB).")
        });
      }
      if (file.type.startsWith("image/")) {
        try {
          setUploading(true);
          if (isSupabaseConfigured) {
            const storageKey = await uploadFileToSupabase(file, "avatars", "profile-images");
            onChange(storageKey);
          } else {
            const base64Url = await fileToDataURL(file);
            onChange(base64Url);
          }
        } catch (error) {
          console.error("Failed to upload file to Supabase Storage, trying base64 fallback:", error);
          try {
            const base64Url = await fileToDataURL(file);
            onChange(base64Url);
          } catch (err) {
            console.error("Failed to convert file to base64:", err);
          }
        } finally {
          setUploading(false);
        }
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileNotice(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setFileNotice({
          type: "error",
          text: t("ui.file_too_large", "File too large. Maximum size is 50MB.")
        });
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        setFileNotice({
          type: "warning",
          text: t("ui.file_large_warning", "Warning: File is large (>30MB).")
        });
      }
      if (file.type.startsWith("image/")) {
        try {
          setUploading(true);
          if (isSupabaseConfigured) {
            const storageKey = await uploadFileToSupabase(file, "avatars", "profile-images");
            onChange(storageKey);
          } else {
            const base64Url = await fileToDataURL(file);
            onChange(base64Url);
          }
        } catch (error) {
          console.error("Failed to upload file to Supabase Storage, trying base64 fallback:", error);
          try {
            const base64Url = await fileToDataURL(file);
            onChange(base64Url);
          } catch (err) {
            console.error("Failed to convert file to base64:", err);
          }
        } finally {
          setUploading(false);
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 select-none">{label}</label>}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`w-full rounded-xl border-2 border-dashed transition-all p-3 flex flex-col gap-3 overflow-hidden ${
          dragOver ? "border-[var(--org-primary)] bg-[var(--org-primary-l)]" : "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
          <div className="flex items-center flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-700/80 focus-within:ring-2 focus-within:ring-[#156c45] focus-within:border-transparent transition">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setFileNotice(null);
                onChange(e.target.value);
              }}
              className="w-full min-w-0 text-xs sm:text-sm bg-transparent border-none outline-none focus:ring-0 dark:text-white truncate"
              placeholder={placeholder || "https://..."}
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  setFileNotice(null);
                  onChange("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded shrink-0 ml-1 cursor-pointer transition"
                title={t("ui.clear_input", "Clear input")}
                aria-label={t("ui.clear_input", "Clear input")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <label className="shrink-0 px-3.5 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl cursor-pointer transition text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-slate-700 select-none min-h-[34px] text-center shadow-3xs">
            {uploading ? (
              <>
                <Spinner size="sm" className="scale-75 shrink-0" />
                <span>{t("ui.uploading", "Uploading...")}</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{t("ui.upload_file", "Upload File")}</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>
        </div>
        {fileNotice && (
          <div
            role="alert"
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
              fileNotice.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{fileNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFileNotice(null)}
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              aria-label={t("common.close", "Close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {resolvedUrl && (
          <div className="h-24 w-auto rounded overflow-hidden flex justify-center bg-gray-50/50 dark:bg-slate-800/50 relative">
            <img 
              src={resolvedUrl} 
              alt={t("ui.preview", "Preview")} 
              className="h-full object-contain animate-fadeIn" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  prefixIcon,
  suffixIcon,
  className = "",
  type,
  ...props
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full flex flex-col gap-1.5 self-start">
      {label && (
        <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 select-none">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {prefixIcon && (
          <div className="absolute left-3 text-gray-400 pointer-events-none">
            {prefixIcon}
          </div>
        )}
        <input
          type={actualType}
          className={`w-full text-sm rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-3xs focus:outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition-all ${
            prefixIcon ? "pl-10" : ""
          } ${suffixIcon || isPassword ? "pr-10" : ""} ${
            error ? "border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          onFocus={(e) => {
            if (props.onFocus) {
              props.onFocus(e);
            }
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              setTimeout(() => {
                try {
                  e.target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                } catch (err) {
                  e.target.scrollIntoView();
                }
              }, 250);
            }
          }}
          onKeyDown={(e) => {
            if (actualType === "number") {
              if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
              }
            }
            if (props.onKeyDown) {
              props.onKeyDown(e);
            }
          }}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5 rounded focus:outline-none cursor-pointer select-none"
            aria-label={showPassword ? t("ui.hide_password", "Hide password") : t("ui.show_password", "Show password")}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : suffixIcon ? (
          <div className="absolute right-3 text-gray-400">
            {suffixIcon}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-normal">{helperText}</p>
      ) : null}
    </div>
  );
};

// ==========================================
// 3. CARD COMPONENT
// ==========================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  action?: React.ReactNode;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  action,
  padding = true,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`card card-glow bg-white dark:bg-slate-850 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-3xs min-w-0 overflow-hidden ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-2 min-w-0">
          {title && (
            <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-100 tracking-tight text-center sm:text-left w-full min-w-0 break-words leading-snug">
              {title}
            </h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`${padding ? "p-6" : ""} min-w-0`}>{children}</div>
    </div>
  );
};

// ==========================================
// 4. MODAL COMPONENT
// ==========================================
export interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  maxWidth
}) => {
  const { t } = useTranslation();
  const isModalVisible = open ?? isOpen ?? false;
  if (!isModalVisible) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl",
    full: "max-w-[96vw] w-[96vw] h-[92dvh] max-h-[92dvh]"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 overscroll-contain">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Content wrapper */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full ${maxWidth || sizes[size]} shadow-2xl flex flex-col overflow-hidden max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto animate-in fade-in zoom-in-[0.98] duration-200 border border-gray-200 dark:border-slate-800`}
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0 min-w-0">
          <h3 className="font-display font-bold text-base sm:text-lg text-gray-900 dark:text-slate-100 min-w-0 break-words leading-snug pr-2">
            {title || t("ui.modal_default_title", "Details")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            &#x2715;
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto w-full flex-1 flex flex-col min-w-0 modal-scroll-area overscroll-contain">{children}</div>
      </div>
    </div>
  );
};

// ==========================================
// 5. BADGE COMPONENT
// ==========================================
export interface BadgeProps {
  children: React.ReactNode;
  color?: "green" | "emerald" | "amber" | "blue" | "red" | "gray" | "purple";
  variant?: "solid" | "outline";
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = "gray",
  variant = "solid",
  className = "",
  dot = false
}) => {
  const styles = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30",
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30",
    gray: "bg-gray-100 text-gray-700 dark:bg-slate-700/50 dark:text-slate-300 border border-gray-200 dark:border-slate-700",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30"
  };

  const dots = {
    green: "bg-emerald-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
    purple: "bg-purple-500"
  };

  const variantStyle = variant === "outline" ? "bg-transparent border" : styles[color];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full select-none max-w-full text-center leading-tight ${variantStyle} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dots[color]}`} />}
      {children}
    </span>
  );
};

// ==========================================
// 6. AVATAR COMPONENT
// ==========================================
export interface AvatarProps {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md"
}) => {
  const sizes = {
    xs: "h-6 w-6 text-[9px]",
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base"
  };

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isIcon = src && src.startsWith("icon:");
  const [resolvedSrc, setResolvedSrc] = React.useState("");

  React.useEffect(() => {
    if (!src || isIcon) {
      setResolvedSrc("");
      return;
    }
    const isUrl = src.startsWith("http") || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:");
    const isSupabaseUrl = src.includes("/storage/v1/object/");
    if (isUrl && !isSupabaseUrl) {
      setResolvedSrc(src);
      return;
    }
    let active = true;
    resolveFileUrl(src).then((url) => {
      if (active) setResolvedSrc(url);
    });
    return () => {
      active = false;
    };
  }, [src, isIcon]);

  let IconComponent = null;
  if (isIcon) {
    const iconName = src.substring(5);
    IconComponent = getLucideIcon(iconName);
  }

  return (
    <div className={`overflow-hidden rounded-full font-bold font-display inline-flex items-center justify-center shrink-0 border border-gray-200 dark:border-slate-700 ${sizes[size]} bg-gradient-to-tr from-[var(--org-primary)] to-[var(--org-secondary)] text-white`}>
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : isIcon && IconComponent ? (
        <IconComponent className={size === "xs" ? "h-3 w-3" : size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-7 w-7"} />
      ) : (
        <span>{initials || "I"}</span>
      )}
    </div>
  );
};

import { motion, AnimatePresence } from "motion/react";

// ==========================================
// 7. TABLE COMPONENT
// ==========================================
export interface TableProps {
  columns: { header: string; accessor: string; cell?: (row: any) => React.ReactNode }[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
}

export const Table: React.FC<TableProps> = ({
  columns,
  data = [],
  loading = false,
  emptyMessage
}) => {
  const { t } = useTranslation();
  const resolvedEmpty = emptyMessage || t("ui.no_records", "No records found");
  return (
    <div className="w-full overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 sm:px-6 py-3.5 whitespace-normal min-w-[90px]">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody layout className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
          <AnimatePresence mode="popLayout" initial={false}>
          {loading ? (
            Array.from({ length: 3 }).map((_, rIdx) => (
              <motion.tr key={`loading-${rIdx}`} layout className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-6 py-5">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                  </td>
                ))}
              </motion.tr>
            ))
          ) : data.length === 0 ? (
            <motion.tr layout key="empty-state">
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-gray-500"
              >
                {resolvedEmpty}
              </td>
            </motion.tr>
          ) : (
            data.map((row, rIdx) => (
              <motion.tr
                key={row.id || rIdx}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, type: "spring", bounce: 0.2 }}
                className="hover:bg-gray-50/50 dark:hover:bg-slate-750 transition"
              >
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className="px-6 py-4 text-gray-700 dark:text-slate-200">
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
          </AnimatePresence>
        </motion.tbody>
      </table>
    </div>
  );
};

// ==========================================
// 8. PAGE HEADER COMPONENT
// ==========================================
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
};

// ==========================================
// 9. STAT CARD COMPONENT
// ==========================================
export interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  progress?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  progress
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col">
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest leading-none">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-[var(--org-primary-l)] text-[var(--org-primary)]">
            {icon}
          </div>
        )}
      </div>
      {change && (
        <div className="text-xs font-semibold mt-4 text-emerald-600 dark:text-emerald-400">
          {change}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-4 w-full">
          <ProgressBar value={progress} />
        </div>
      )}
    </div>
  );
};

// ==========================================
// 10. EMPTY STATE COMPONENT
// ==========================================
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50/50 dark:bg-slate-800/20 rounded-3xl border border-gray-100 dark:border-slate-800 select-none">
      {icon ? (
        <div className="p-4 bg-white/50 dark:bg-slate-700/50 shadow-sm rounded-full text-gray-400 mb-4.5">
          {icon}
        </div>
      ) : (
        <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 text-brand-amber rounded-full mb-4.5">
          <AlertTriangle className="h-8 w-8" />
        </div>
      )}
      <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mt-2 mb-6">
        {message}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

// ==========================================
// 11. PROGRESS BAR COMPONENT
// ==========================================
export interface ProgressBarProps {
  value: number;
  max?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100
}) => {
  const { t } = useTranslation();
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1 text-[10px] md:text-xs text-gray-500 font-semibold uppercase">
        <span>{t("ui.progress", "Progress")}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div
          className="bg-[var(--org-primary)] h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ==========================================
// 12. UNDERLINE TABS
// ==========================================
export interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  active,
  onChange
}) => {
  return (
    <div className="flex items-center gap-6 border-b border-gray-200 dark:border-slate-700 w-full overflow-x-auto scrollbar-none shrink-0 mb-6 font-display">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`pb-3.5 text-xs md:text-sm font-semibold tracking-wide border-b-2 hover:text-gray-900 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              isActive
                ? "border-[var(--org-primary)] text-[var(--org-primary)] font-bold"
                : "border-transparent text-gray-500 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

// ==========================================
// 13. CONFIRM DIALOG COMPONENT
// ==========================================
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  danger = false
}) => {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500 break-words">{message}</p>
        <div className="flex flex-wrap items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onCancel}>
            {t("ui.cancel", "Cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {t("ui.confirm", "Confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
