export default function Header({ theme, isLoading, onThemeToggle, onRefresh }) {
  const isDark = theme === 'dark';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href="#top" aria-label="상장노트 홈">
          <strong>상장노트</strong>
          <span>공시 기반 IPO 일정 정리 서비스</span>
        </a>

        <nav className="main-nav" aria-label="주요 메뉴">
          <a className="is-active" href="#schedule">IPO 일정</a>
          <a href="#latest">최신 공시</a>
          <a href="#notice">데이터 안내</a>
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={isDark ? '화이트 모드로 변경' : '다크 모드로 변경'}
            aria-pressed={isDark}
            onClick={onThemeToggle}
          >
            <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
          </button>
          <button className="refresh-button" type="button" onClick={onRefresh} disabled={isLoading}>
            <span aria-hidden="true">↻</span>
            {isLoading ? '업데이트 중' : '데이터 업데이트'}
          </button>
        </div>
      </div>
    </header>
  );
}
