import React from 'react';

export default function SkillCard({ skill, onEdit, onDelete, onToggle }) {
  const name = skill.displayName || skill.name;

  return (
    <div className={`skill-card ${!skill.enabled ? 'disabled' : ''}`}>
      <div className="skill-card-header">
        <div className="skill-card-title">
          <div className="skill-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <span className="skill-card-name" title={name}>{name}</span>
        </div>

        <label className="toggle-switch" title={skill.enabled ? '禁用技能' : '启用技能'}>
          <input
            type="checkbox"
            checked={skill.enabled}
            onChange={(e) => onToggle(skill.name, e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {skill.description && (
        <p className="skill-card-desc">{skill.description}</p>
      )}

      <div className="skill-card-meta">
        {skill.version && (
          <span className="skill-card-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            v{skill.version}
          </span>
        )}
        {skill.author && (
          <span className="skill-card-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {skill.author}
          </span>
        )}
        {(skill.triggers || []).slice(0, 3).map((t) => (
          <span key={t} className="skill-card-badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {t}
          </span>
        ))}
        {(skill.triggers || []).length > 3 && (
          <span className="skill-card-badge">+{skill.triggers.length - 3}</span>
        )}
      </div>

      <div className="skill-card-footer">
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {skill.name}
        </span>
        <div className="skill-card-actions">
          <button className="skill-card-action" onClick={() => onEdit(skill)} title="编辑技能">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="skill-card-action danger" onClick={() => onDelete(skill.name)} title="删除技能">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
