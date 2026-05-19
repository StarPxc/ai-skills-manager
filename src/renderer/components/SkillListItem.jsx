import React from 'react';

export default function SkillListItem({ skill, selected, onSelect, onToggle, batchMode, checked, onCheck }) {
  return (
    <div
      className={`skill-list-item ${selected || checked ? 'selected' : ''} ${!skill.enabled ? 'disabled' : ''}`}
      onClick={() => batchMode ? onCheck(skill.name) : onSelect(skill)}
    >
      {batchMode && (
        <input
          type="checkbox"
          className="skill-checkbox"
          checked={checked}
          onChange={() => onCheck(skill.name)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="skill-list-item-main">
        <span className="skill-list-item-name">{skill.displayName || skill.name}</span>
        {skill.description && (
          <span className="skill-list-item-desc">{skill.description.substring(0, 60)}{skill.description.length > 60 ? '...' : ''}</span>
        )}
      </div>
      <div className="skill-list-item-right">
        {skill.author && <span className="skill-list-item-author">{skill.author}</span>}
        {!batchMode && (
          <label className="toggle-switch" onClick={(e) => e.stopPropagation()} title={skill.enabled ? '禁用' : '启用'}>
            <input
              type="checkbox"
              checked={skill.enabled}
              onChange={(e) => onToggle(skill.name, e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        )}
      </div>
    </div>
  );
}
