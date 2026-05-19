import React from 'react';

export default function SkillListItem({ skill, selected, onSelect, onToggle }) {
  return (
    <div
      className={`skill-list-item ${selected ? 'selected' : ''} ${!skill.enabled ? 'disabled' : ''}`}
      onClick={() => onSelect(skill)}
    >
      <div className="skill-list-item-main">
        <span className="skill-list-item-name">{skill.displayName || skill.name}</span>
        {skill.description && (
          <span className="skill-list-item-desc">{skill.description.substring(0, 60)}{skill.description.length > 60 ? '...' : ''}</span>
        )}
      </div>
      <div className="skill-list-item-right">
        {skill.author && <span className="skill-list-item-author">{skill.author}</span>}
        <label className="toggle-switch" onClick={(e) => e.stopPropagation()} title={skill.enabled ? '禁用' : '启用'}>
          <input
            type="checkbox"
            checked={skill.enabled}
            onChange={(e) => onToggle(skill.name, e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  );
}
