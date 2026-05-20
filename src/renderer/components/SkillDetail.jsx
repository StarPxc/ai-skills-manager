import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function SkillDetail({ skill, onEdit, onDelete, isCreating, onCreate, onCancelCreate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', displayName: '', description: '', version: '1.0.0',
    author: '', triggers: [], content: '', enabled: true,
  });
  const [triggerInput, setTriggerInput] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState('');
  const [translateError, setTranslateError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (skill) {
      setForm({
        name: skill.name || '',
        displayName: skill.displayName || '',
        description: skill.description || '',
        version: skill.version || '1.0.0',
        author: skill.author || '',
        triggers: [...(skill.triggers || [])],
        content: skill.content || '',
        enabled: skill.enabled !== false,
      });
      setEditing(false);
      setTranslated('');
      setTranslateError('');
      setCopied(false);
      if (isCreating) {
        setEditing(true);
      } else {
        window.api.loadTranslation(skill.name).then((t) => {
          if (t) setTranslated(t);
        }).catch(() => {});
      }
    }
  }, [skill]);

  if (!skill) {
    return (
      <div className="detail-empty">
        <svg viewBox="0 0 200 120" fill="none" width="160" height="96">
          <rect x="20" y="15" width="160" height="90" rx="10" fill="var(--bg-tertiary)" stroke="var(--border-primary)" strokeWidth="1.5" />
          <rect x="35" y="30" width="100" height="8" rx="4" fill="var(--accent)" opacity="0.25" />
          <rect x="35" y="46" width="80" height="6" rx="3" fill="var(--border-primary)" />
          <rect x="35" y="58" width="110" height="6" rx="3" fill="var(--border-primary)" />
          <rect x="35" y="70" width="70" height="6" rx="3" fill="var(--border-primary)" />
        </svg>
        <p>选择左侧技能查看详情</p>
      </div>
    );
  }

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const addTrigger = () => {
    const v = triggerInput.trim();
    if (v && !form.triggers.includes(v)) {
      setForm((p) => ({ ...p, triggers: [...p.triggers, v] }));
      setTriggerInput('');
    }
  };
  const removeTrigger = (i) => setForm((p) => ({ ...p, triggers: p.triggers.filter((_, idx) => idx !== i) }));

  const handleCopy = () => {
    navigator.clipboard.writeText(skill.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTranslate = async () => {
    if (!skill?.content) return;
    setTranslating(true);
    setTranslateError('');
    try {
      const apiKey = await window.api.getApiKey();
      if (!apiKey) {
        setTranslateError('请先在设置中配置 DeepSeek API Key');
        setTranslating(false);
        return;
      }
      const result = await window.api.translate(skill.content, apiKey);
      if (result.success) {
        setTranslated(result.translated);
        const saveResult = await window.api.saveTranslation(skill.name, result.translated);
        if (!saveResult.success) {
          console.error('保存翻译失败:', saveResult.error);
        }
      } else {
        setTranslateError(result.error || '翻译失败');
      }
    } catch (err) {
      setTranslateError('翻译失败: ' + err.message);
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = () => {
    const data = {
      ...form,
      name: form.name.trim().replace(/\s+/g, '-').toLowerCase(),
    };
    if (isCreating) {
      onCreate(data);
    } else {
      onEdit(data);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="detail-panel">
        <div className="detail-header">
          <h2>{isCreating ? '新增技能' : '编辑技能'}</h2>
          <button className="modal-close" onClick={() => { setEditing(false); if (isCreating && onCancelCreate) onCancelCreate(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="detail-body">
          <div className="form-row">
            <div className="form-group">
              <label>标识 *</label>
              <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>显示名称</label>
              <input value={form.displayName} onChange={(e) => handleChange('displayName', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={2} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>版本</label>
              <input value={form.version} onChange={(e) => handleChange('version', e.target.value)} />
            </div>
            <div className="form-group">
              <label>作者</label>
              <input value={form.author} onChange={(e) => handleChange('author', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>触发短语</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={triggerInput} onChange={(e) => setTriggerInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrigger(); } }} placeholder="输入后回车添加" />
              <button className="btn btn-secondary btn-sm" onClick={addTrigger}>添加</button>
            </div>
            {form.triggers.length > 0 && (
              <div className="form-triggers">
                {form.triggers.map((t, i) => (
                  <span key={i} className="trigger-tag">{t}
                    <button onClick={() => removeTrigger(i)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>SKILL.md 内容</label>
            <div className="md-editor-split">
              <textarea
                value={form.content}
                onChange={(e) => handleChange('content', e.target.value)}
                className="md-editor-textarea"
                placeholder="# 技能名称&#10;&#10;## 描述&#10;..."
                spellCheck={false}
              />
              <div className="md-editor-preview markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content || '*输入内容后实时预览*'}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
        <div className="detail-footer">
          <button className="btn btn-secondary" onClick={() => { setEditing(false); if (isCreating && onCancelCreate) onCancelCreate(); }}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>保存</button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="detail-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <h2>{skill.displayName || skill.name}</h2>
            <span className="detail-name-id">{skill.name}</span>
          </div>
        </div>
        <div className="detail-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            编辑
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(skill.name)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            删除
          </button>
        </div>
      </div>

      <div className="detail-body">
        {skill.description && (
          <div className="detail-section">
            <h3>描述</h3>
            <p>{skill.description}</p>
          </div>
        )}

        <div className="detail-meta">
          {skill.version && <span className="skill-card-badge">v{skill.version}</span>}
          {skill.author && <span className="skill-card-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>{skill.author}</span>}
          {skill.enabled !== undefined && (
            <span className={`skill-card-badge ${skill.enabled ? '' : 'badge-disabled'}`}>
              {skill.enabled ? '已启用' : '已禁用'}
            </span>
          )}
        </div>

        {skill.triggers && skill.triggers.length > 0 && (
          <div className="detail-section">
            <h3>触发短语</h3>
            <div className="form-triggers">
              {skill.triggers.map((t, i) => <span key={i} className="trigger-tag">{t}</span>)}
            </div>
          </div>
        )}

        {skill.content && (
          <div className="detail-section">
            <div className="detail-section-header">
              <h3>技能内容</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  {copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                  {copied ? '已复制' : '复制'}
                </button>
                <button
                className="btn btn-secondary btn-sm"
                onClick={handleTranslate}
                disabled={translating}
              >
                {translating ? (
                  <span className="spinner-small" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                )}
                {translating ? '翻译中...' : translated ? '重新翻译' : '译成中文'}
              </button>
              </div>
            </div>
            <div className="detail-content markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{skill.content}</ReactMarkdown>
            </div>
            {translateError && (
              <div className="translate-error">{translateError}</div>
            )}
            {translated && (
              <div className="detail-section" style={{ marginTop: 16 }}>
                <div className="detail-section-header">
                  <h3>中文翻译</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    navigator.clipboard.writeText(translated).then(() => setCopied(true));
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    复制
                  </button>
                </div>
                <div className="detail-content translated markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{translated}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
