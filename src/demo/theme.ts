/**
 * Theme handling: dark/light mode toggle
 */

let isDarkTheme = true;

export function toggleTheme(): void {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('light-theme', !isDarkTheme);
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = isDarkTheme ? '🌙' : '☀️';
  }
  localStorage.setItem('gto-theme', isDarkTheme ? 'dark' : 'light');
}

export function loadTheme(): void {
  const saved = localStorage.getItem('gto-theme');
  if (saved === 'light') {
    isDarkTheme = false;
    document.body.classList.add('light-theme');
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = '☀️';
    }
  }
}

export function isDark(): boolean {
  return isDarkTheme;
}
