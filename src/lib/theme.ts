import { LocalStorage, localStorageKeys } from "@/lib/storage";

/**
 * Light and dark theme. The theme is the `dark` class on <html> (see
 * tokens.css). Without a stored choice it follows the operating system.
 */
const DARK_CLASS = "dark";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function apply(isDark: boolean) {
  document.documentElement.classList.toggle(DARK_CLASS, isDark);
  listeners.forEach((listener) => listener());
}

export function isDarkTheme() {
  return document.documentElement.classList.contains(DARK_CLASS);
}

export function setDarkTheme(isDark: boolean) {
  LocalStorage.set(localStorageKeys.theme, isDark ? "dark" : "light");
  apply(isDark);
}

export function subscribeToTheme(listener: () => void) {
  const systemQuery = window.matchMedia(SYSTEM_DARK_QUERY);

  // Follow the operating system until the visitor picks a theme.
  const handleSystemChange = () => {
    if (LocalStorage.get(localStorageKeys.theme) === null) {
      apply(systemQuery.matches);
    }
  };

  listeners.add(listener);
  systemQuery.addEventListener("change", handleSystemChange);

  return () => {
    listeners.delete(listener);
    systemQuery.removeEventListener("change", handleSystemChange);
  };
}

/**
 * Inline script for <head>: applies the theme before the first paint, so a
 * dark-theme visitor never sees a light flash. Mirrors the logic above and
 * reads the value the storage helper wrote (a JSON string).
 */
export const themeInitScript = [
  "(function(){try{",
  `var s=JSON.parse(localStorage.getItem(${JSON.stringify(localStorageKeys.theme)}));`,
  `var d=s==="dark"||(s!=="light"&&matchMedia(${JSON.stringify(SYSTEM_DARK_QUERY)}).matches);`,
  `document.documentElement.classList.toggle(${JSON.stringify(DARK_CLASS)},d)`,
  "}catch(e){}})()",
].join("");
