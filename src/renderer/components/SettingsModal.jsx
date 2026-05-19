import React, { useState, useEffect } from 'react';

const PRESETS = [
  { label: 'Claude Code', path: '' }, // filled on mount
  { label: 'OpenCode', path: '' },    // filled on mount
  { label: '自定义', path: '__custom__' },
];

export default function SettingsModal({ currentDir, onSave, onClose, onNotify }) {
  const [dirPath, setDirPath] = useState(currentDir || '');
  const [preset, setPreset] = useState('');
  const [defaultDir, setDefaultDir] = useState('');
  const [openCodeDir, setOpenCodeDir] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [logPath, setLogPath] = useState('');
  const [syncDir, setSyncDir] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    window.api.getDefaultSkillsDir().then((d) => {
      setDefaultDir(d);
      PRESETS[0].path = d;
      const ocDir = d.replace(/\.claude\/skills$/, '.config/opencode/skills');
      PRESETS[1].path = ocDir;
      setOpenCodeDir(ocDir);
      if (currentDir === d) setPreset(d);
      else if (currentDir === ocDir) setPreset(ocDir);
      else { setPreset('__custom__'); }
    });
    window.api.getApiKey().then(setApiKey);
    window.api.getLogPath().then(setLogPath);
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handlePresetChange = (p) => {
    setPreset(p);
    if (p !== '__custom__') setDirPath(p);
  };

  const handleBrowse = async () => {
    const result = await window.api.selectFolder();
    if (result.success && result.folderPath) {
      setDirPath(result.folderPath);
      setPreset('__custom__');
    }
  };

  const handleSave = async () => {
    const finalDir = dirPath.trim() || defaultDir;
    await window.api.setApiKey(apiKey.trim());
    await window.api.setSkillsDir(finalDir);
    onSave(finalDir);
  };

  const handleSync = async () => {
    if (!syncDir) return;
    setSyncing(true);
    try {
      const result = await window.api.syncSkills(currentDir, syncDir);
      if (result.success) {
        onNotify(`同步完成：已复制 ${result.copied} 个，跳过 ${result.skipped} 个`);
      } else {
        onNotify(result.error || '同步失败', 'error');
      }
    } catch (err) {
      alert('同步失败: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>设置</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span>配置技能存储目录与 DeepSeek API Key。</span>
          </div>

          <div className="form-group">
            <label>技能目录</label>
            <div className="preset-options">
              <label className={`preset-option ${preset === PRESETS[0].path ? 'active' : ''}`}>
                <input type="radio" name="preset" checked={preset === PRESETS[0].path} onChange={() => handlePresetChange(PRESETS[0].path)} />
                <span className="preset-label">Claude Code</span>
                <span className="preset-path">{PRESETS[0].path}</span>
              </label>
              <label className={`preset-option ${preset === PRESETS[1].path ? 'active' : ''}`}>
                <input type="radio" name="preset" checked={preset === PRESETS[1].path} onChange={() => handlePresetChange(PRESETS[1].path)} />
                <span className="preset-label">OpenCode</span>
                <span className="preset-path">{PRESETS[1].path}</span>
              </label>
              <label className={`preset-option ${preset === '__custom__' ? 'active' : ''}`}>
                <input type="radio" name="preset" checked={preset === '__custom__'} onChange={() => handlePresetChange('__custom__')} />
                <span className="preset-label">自定义</span>
              </label>
            </div>
            <div className="dir-input-row" style={{ marginTop: 10 }}>
              <input
                type="text"
                value={dirPath}
                onChange={(e) => { setDirPath(e.target.value); setPreset('__custom__'); }}
                placeholder={defaultDir}
                spellCheck={false}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleBrowse}>浏览...</button>
            </div>
          </div>

          <div className="form-group">
            <label>DeepSeek API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." spellCheck={false} />
            <div className="form-hint">用于技能内容一键翻译。在 platform.deepseek.com 获取</div>
          </div>

          <div className="settings-current">
            <strong>当前目录：</strong><br /><code>{currentDir}</code>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>同步到其他目录</label>
            <div className="dir-input-row">
              <select
                value={syncDir}
                onChange={(e) => setSyncDir(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">— 选择目标目录 —</option>
                {PRESETS.filter(p => p.path !== currentDir && p.path !== '__custom__' && p.path).map(p => (
                  <option key={p.path} value={p.path}>{p.label} — {p.path}</option>
                ))}
              </select>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSync}
                disabled={!syncDir || syncing}
              >
                {syncing ? (
                  <span className="spinner-small" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                )}
                {syncing ? '同步中...' : '同步'}
              </button>
            </div>
            <div className="form-hint">将当前目录的技能复制到目标目录（已存在的跳过）</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.api.openLog()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              打开日志文件
            </button>
            <div className="form-hint" style={{ marginTop: 6 }}>日志路径：<code style={{ fontSize: 10 }}>{logPath}</code></div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!dirPath.trim()}>保存设置</button>
        </div>
      </div>
    </div>
  );
}
