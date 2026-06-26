export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

/** OWASP-aligned complexity for new account passwords. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) =>
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A–Z)",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a–z)",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "One special character (!@#$…)",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function getPasswordValidationError(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  if (failed) {
    return "Password must meet all requirements listed below.";
  }
  return null;
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password.length > 0 && password === confirmPassword;
}
