import React, { useState } from 'react';

export default function Header({ theme, onToggleTheme, onAdd, onInstallZip, onOpenSettings, mode, onModeChange }) {
  const [capturing, setCapturing] = useState(false);

  const handleScreenshot = async () => {
    setCapturing(true);
    try {
      const result = await window.api.screenshot();
      if (result.success) {
        alert(`截图已保存到桌面:\n${result.path}`);
      } else {
        alert('截图失败: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      alert('截图失败: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };
  return (
    <header className="header">
      <div className="header-logo">
        <svg viewBox="0 0 32 32" fill="none" width="26" height="26">
          <rect width="32" height="32" rx="8" fill="var(--accent)" />
          <path d="M8 12h16M8 20h12M8 16h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span>AI 工作台</span>
      </div>

      <div className="header-nav">
        <button
          className={`header-nav-btn ${mode === 'skills' ? 'active' : ''}`}
          onClick={() => onModeChange('skills')}
        >
          技能
        </button>
        <button
          className={`header-nav-btn ${mode === 'sessions' ? 'active' : ''}`}
          onClick={() => onModeChange('sessions')}
        >
          会话
        </button>
      </div>

      <div className="header-actions">
        {mode === 'skills' && (
          <>
            <button className="header-btn primary" onClick={onAdd} title="新增技能">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M12 5v14M5 12h14" /></svg>
              新增
            </button>
            <button className="header-btn" onClick={onInstallZip} title="导入技能包">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              导入
            </button>
          </>
        )}
        <button className="header-btn" onClick={handleScreenshot} disabled={capturing} title="截图保存到桌面">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          {capturing ? '...' : '截图'}
        </button>
        <div className="header-divider" />
        <button className="header-btn icon-only" onClick={onToggleTheme} title={theme === 'light' ? '深色模式' : '浅色模式'}>
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          )}
        </button>
        <button className="header-btn icon-only" onClick={onOpenSettings} title="设置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </button>
      </div>
    </header>
  );
}
