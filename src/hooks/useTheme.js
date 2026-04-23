import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sangjang-note-theme';
const THEMES = ['light', 'dark'];

function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light';

  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (THEMES.includes(savedTheme)) return savedTheme;

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 저장소 접근이 막힌 브라우저에서도 화면 전환은 계속 동작하게 둡니다.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
}
