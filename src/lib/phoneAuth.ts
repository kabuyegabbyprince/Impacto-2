/**
 * Phone Number & Full Name Validation and Normalization Utilities
 * Grounded for Rwandan cooperative phone formats (MTN / Airtel-Tigo) and international numbers
 */

/**
 * Normalizes phone numbers to standard format (e.g., +250 788 123 456 -> +250788123456)
 */
export const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return "";
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");

  // Rwandan numbers starting with 250 (12 digits)
  if (digits.startsWith("250") && digits.length === 12) {
    return `+${digits}`;
  }

  // Rwandan local numbers starting with 07 (10 digits)
  if (digits.startsWith("07") && digits.length === 10) {
    return `+250${digits.slice(1)}`;
  }

  // Rwandan numbers starting with 7 (9 digits)
  if (digits.length === 9 && digits.startsWith("7")) {
    return `+250${digits}`;
  }

  // If already starts with +
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  // Fallback to formatted digits or original
  return digits.length >= 8 ? `+${digits}` : trimmed;
};

/**
 * Checks whether an input string is a telephone number rather than an email
 */
export const isTelephoneInput = (val: string): boolean => {
  const trimmed = val.trim();
  if (!trimmed || trimmed.includes("@")) return false;
  // Contains at least 7 digits/phone symbols
  return /^[+0-9\s().-]{7,}$/.test(trimmed);
};

/**
 * Synthesizes a valid, clean email address for phone-only registered accounts
 * so that all database/auth email constraints remain satisfied
 */
export const getPhoneSyntheticEmail = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const cleanDigits = normalized.replace(/[^0-9]/g, "");
  return `phone_${cleanDigits}@phone.impacto.rw`;
};

/**
 * Validates that a user's name is a legitimate, authentic full name (at least 2 words)
 */
export const validateLegalFullName = (name: string): { valid: boolean; message?: string } => {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { valid: false, message: "Full Name is required." };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return {
      valid: false,
      message: "Please enter your official legal full name (First and Last Name) to ensure verified cooperative membership."
    };
  }

  if (trimmed.length < 4) {
    return {
      valid: false,
      message: "Full name must be at least 4 characters."
    };
  }

  return { valid: true };
};
