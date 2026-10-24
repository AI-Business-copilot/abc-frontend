const allowedSymbols = "!@#$%^&*()_+-=[]{};':\"\\|<>?,./`~";

export function isStrongPassword(password: string) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    [...password].some((character) => allowedSymbols.includes(character))
  );
}
