/**
 * SOMAKID AI - Validation Utilities
 * Form and data validation helpers.
 */

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

/**
 * Validate password strength.
 * Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number.
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Validate a child PIN code (exactly 4 digits).
 */
export function isValidChildPIN(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Validate that a child's age is within the allowed range.
 */
export function isValidChildAge(age: number): boolean {
  return age >= 3 && age <= 15;
}

/**
 * Validate that text is not empty after trimming.
 */
export function isNotEmpty(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Validate that text length is within limits.
 */
export function isWithinLength(text: string, min: number, max: number): boolean {
  return text.length >= min && text.length <= max;
}

/**
 * Get password strength description.
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) return 'weak';
  let score = 0;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}