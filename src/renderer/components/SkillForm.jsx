import React, { useState, useEffect } from 'react';

export default function SkillForm({ skill, onSave, onClose }) {
  const isEditing = !!skill;
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    description: '',
    version: '1.0.0',
    author: '',
    triggers: [],
    enabled: true,
    content: '',
  });
  const [triggerInput, setTriggerInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (skill) {
      setForm({
        name: skill.name || '',
        displayName: skill.displayName || '',
        description: skill.description || '',
        version: skill.version || '1.0.0',
        author: skill.author || '',
        triggers: [...(skill.triggers || [])],
        enabled: skill.enabled !== false,
        content: skill.content || '',
      });
    }
  }, [skill]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTrigger = () => {
    const val = triggerInput.trim();
    if (val && !form.triggers.includes(val)) {
      setForm((prev) => ({ ...prev, triggers: [...prev.triggers, val] }));
      setTriggerInput('');
    }
  };

  const removeTrigger = (index) => {
    setForm((prev) => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim().replace(/\s+/g, '-').toLowerCase(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? '编辑技能' : '新增技能'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>技能标识 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="my-skill-name"
                  disabled={isEditing}
                  required
                />
                <div className="form-hint">唯一标识，仅限小写字母、数字和连字符</div>
              </div>
              <div className="form-group">
                <label>显示名称 *</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  placeholder="我的技能"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>描述</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="简要描述该技能的功能..."
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>版本</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => handleChange('version', e.target.value)}
                  placeholder="1.0.0"
                />
              </div>
              <div className="form-group">
                <label>作者</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => handleChange('author', e.target.value)}
                  placeholder="你的名字"
                />
              </div>
            </div>

            <div className="form-group">
              <label>触发短语</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTrigger();
                    }
                  }}
                  placeholder="输入触发短语后回车添加"
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addTrigger}>
                  添加
                </button>
              </div>
              {form.triggers.length > 0 && (
                <div className="form-triggers">
                  {form.triggers.map((t, i) => (
                    <span key={i} className="trigger-tag">
                      {t}
                      <button type="button" onClick={() => removeTrigger(i)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="form-hint">当用户输入包含这些短语时会自动激活此技能</div>
            </div>

            <div className="form-group">
              <label>技能内容 (SKILL.md)</label>
              <textarea
                value={form.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder={`# 技能名称\n\n## 描述\n简要描述该技能的功能...\n\n## 触发条件\n列出触发条件...\n\n## 指令\n技能的具体指令和逻辑...`}
                rows={8}
              />
              <div className="form-hint">可选，填写 SKILL.md 内容。留空将自动生成模板。</div>
            </div>

            {isEditing && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => handleChange('enabled', e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  启用技能
                </label>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
              {saving ? '保存中...' : isEditing ? '更新技能' : '创建技能'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
