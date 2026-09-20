// BROWSER-ONLY module: touches `window.localStorage` with no IS_BROWSER /
// typeof-window guard. Not imported by anything (classification only).
export function readTheme(): string {
  return window.localStorage.getItem("theme") ?? "light";
}

export function saveTheme(theme: string): void {
  window.localStorage.setItem("theme", theme);
}
