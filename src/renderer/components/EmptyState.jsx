import React from 'react';

export default function EmptyState({ hasSearch, onAdd, onInstallZip }) {
  return (
    <div className="empty-state">
      <div className="empty-state-illustration">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="50" width="120" height="100" rx="12" fill="var(--bg-tertiary)" stroke="var(--border-primary)" strokeWidth="2" />
          <rect x="52" y="62" width="96" height="8" rx="4" fill="var(--accent)" opacity="0.3" />
          <rect x="52" y="78" width="72" height="6" rx="3" fill="var(--border-primary)" />
          <rect x="52" y="90" width="84" height="6" rx="3" fill="var(--border-primary)" />
          <rect x="52" y="102" width="60" height="6" rx="3" fill="var(--border-primary)" />
          <rect x="52" y="120" width="96" height="6" rx="3" fill="var(--accent)" opacity="0.15" />
          <rect x="52" y="132" width="78" height="6" rx="3" fill="var(--border-primary)" />
          <circle cx="170" cy="50" r="18" fill="var(--accent)" />
          <path d="M165 50h10M170 45v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {hasSearch ? (
        <>
          <h3 className="empty-state-title">未找到匹配的技能</h3>
          <p className="empty-state-desc">
            尝试使用不同的关键词搜索，或检查拼写是否正确。
          </p>
        </>
      ) : (
        <>
          <h3 className="empty-state-title">还没有安装任何技能</h3>
          <p className="empty-state-desc">
            Claude Skills 可以扩展 AI 助手的功能。创建你的第一个技能，或从 ZIP 包导入已有的技能。
          </p>
          <div className="empty-state-actions">
            <button className="empty-state-btn primary" onClick={onAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
                <path d="M12 5v14M5 12h14" />
              </svg>
              创建技能
            </button>
            <button className="empty-state-btn secondary" onClick={onInstallZip}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              导入技能包
            </button>
          </div>
        </>
      )}
    </div>
  );
}
