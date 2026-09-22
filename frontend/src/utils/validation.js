/**
 * Client-side validators. Each returns an error message string, or '' when valid.
 * These are UX helpers only; the backend must still validate everything.
 * Keep rules in sync with Shashank's server-side validation.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, including a letter and a number.`

export function validateName(value) {
  const v = value.trim()
  if (!v) return 'Enter your full name.'
  if (v.length < 2) return 'Name must be at least 2 characters.'
  if (v.length > 80) return 'Name must be 80 characters or fewer.'
  return ''
}

export function validateEmail(value) {
  const v = value.trim()
  if (!v) return 'Enter your email address.'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address, e.g. name@example.com.'
  return ''
}

/** For login: only checks that something was entered (never leak password rules there). */
export function validateRequiredPassword(value) {
  return value ? '' : 'Enter your password.'
}

/** For registration: enforces the password policy. */
export function validateNewPassword(value) {
  if (!value) return 'Create a password.'
  if (value.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Password must include at least one letter and one number.'
  return ''
}

export function validateConfirmPassword(value, password) {
  if (!value) return 'Confirm your password.'
  if (value !== password) return 'Passwords do not match.'
  return ''
}

/** Drops empty messages so the result only contains fields that have errors. */
export function compactErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message))
}

export function validateResourceTitle(value) {
  const v = value.trim()
  if (!v) return 'Enter a title.'
  if (v.length > 160) return 'Title must be 160 characters or fewer.'
  return ''
}

export function validateResourceDescription(value) {
  const v = value.trim()
  if (!v) return 'Enter a description.'
  if (v.length > 2000) return 'Description must be 2000 characters or fewer.'
  return ''
}

export function validateResourceType(value) {
  return value ? '' : 'Select a resource type.'
}

export function validateOptionalUrl(value) {
  const v = value.trim()
  if (!v) return ''
  try {
    new URL(v)
    return ''
  } catch {
    return 'Enter a full URL, e.g. https://example.com/report.pdf'
  }
}
