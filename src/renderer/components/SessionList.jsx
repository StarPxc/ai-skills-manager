import React from 'react';

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[d.getDay()] + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatCost(c) {
  if (!c || c === 0) return '';
  return '$' + c.toFixed(4);
}

export default function SessionList({ sessions, selectedId, onSelect, loading, searchQuery, onSearchChange, source, onSourceChange }) {
  const filtered = searchQuery.trim()
    ? sessions.filter((s) => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;

  return (
    <>
      <div className="left-toolbar">
        <div className="session-source-tabs">
          <button
            className={`session-source-tab ${source === 'opencode' ? 'active' : ''}`}
            onClick={() => onSourceChange('opencode')}
          >
            OpenCode
          </button>
          <button
            className={`session-source-tab ${source === 'claude' ? 'active' : ''}`}
            onClick={() => onSourceChange('claude')}
          >
            Claude
          </button>
        </div>
      </div>

      <div className="left-toolbar">
        <div className="left-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder={`搜索 ${sessions.length} 个会话...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onSearchChange('')}
          />
          {searchQuery && (
            <button className="left-search-clear" onClick={() => onSearchChange('')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" /><p>加载中...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 200 120" fill="none" width="120" height="72">
            <rect x="20" y="15" width="160" height="90" rx="10" fill="var(--bg-tertiary)" stroke="var(--border-primary)" strokeWidth="1.5" />
            <rect x="35" y="28" width="60" height="4" rx="2" fill="var(--accent)" opacity="0.25" />
            <rect x="35" y="38" width="90" height="4" rx="2" fill="var(--border-primary)" />
            <rect x="35" y="48" width="75" height="4" rx="2" fill="var(--border-primary)" />
            <rect x="35" y="58" width="50" height="4" rx="2" fill="var(--border-primary)" />
            <rect x="35" y="72" width="100" height="4" rx="2" fill="var(--text-tertiary)" opacity="0.2" />
            <rect x="35" y="82" width="80" height="4" rx="2" fill="var(--text-tertiary)" opacity="0.2" />
          </svg>
          <div className="empty-state-title">
            {searchQuery ? '未找到匹配会话' : `暂无 ${source === 'claude' ? 'Claude Code' : 'OpenCode'} 会话`}
          </div>
          <div className="empty-state-desc">
            {searchQuery ? '尝试其他搜索词' : `使用 ${source === 'claude' ? 'Claude Code' : 'OpenCode'} 进行对话后将自动出现在这里`}
          </div>
        </div>
      ) : (
        <div className="skill-list">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`skill-list-item ${selectedId === s.id ? 'selected' : ''}`}
              onClick={() => onSelect(s)}
            >
              <div className="skill-list-item-main">
                <div className="skill-list-item-name">{s.title || '未命名会话'}</div>
                <div className="skill-list-item-desc">
                  {s.model
                    ? s.model
                    : s.project
                      ? (s.project.replace(/^\/Users\/\w+/, '~') || s.project)
                      : ''}
                </div>
              </div>
              <div className="skill-list-item-right">
                {(s.cost || formatCost(s.cost)) && (
                  <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500, flexShrink: 0 }}>
                    {s.cost ? '$' + Number(s.cost).toFixed(4) : formatCost(s.cost)}
                  </span>
                )}
                <span className="skill-list-item-author">{formatDate(s.time_created)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
