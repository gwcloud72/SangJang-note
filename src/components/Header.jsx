export default function Header({ theme, onThemeToggle }) {
  const isDark = theme === 'dark';

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="상장노트 홈">
        <span className="brand-mark">상</span>
        <span>상장노트</span>
      </a>

      <div className="header-actions">
        <nav className="header-pills" aria-label="프로젝트 특징">
          <span>React</span>
          <span>OpenDART</span>
          <span>자동배포</span>
        </nav>

        <button
          className="theme-toggle"
          type="button"
          aria-label={isDark ? '화이트 모드로 변경' : '다크 모드로 변경'}
          aria-pressed={isDark}
          onClick={onThemeToggle}
        >
          <span className="theme-toggle__icon" aria-hidden="true">{isDark ? '☀' : '☾'}</span>
          <span>{isDark ? '화이트' : '다크'}</span>
        </button>
      </div>
    </header>
  );
}
