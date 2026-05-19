import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import SkillListItem from './components/SkillListItem';
import SkillDetail from './components/SkillDetail';
import EmptyState from './components/EmptyState';
import Toast from './components/Toast';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('installed');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('skills-manager-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [skillsDir, setSkillsDir] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadSkills = useCallback(async () => {
    if (!window.api) {
      notify('应用未完全加载，请重启', 'error');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await window.api.getSkills();
      if (Array.isArray(result)) {
        setSkills(result);
      } else if (result?.success === false) {
        notify(result.error || '加载失败', 'error');
      }
    } catch (err) {
      notify('加载技能列表失败: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadSkills();
    window.api.getSkillsDir().then((r) => setSkillsDir(r?.path || ''));
  }, [loadSkills]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skills-manager-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const handleEdit = useCallback(async (skillData) => {
    try {
      const result = await window.api.saveSkill(skillData);
      if (result.success) {
        setSkills(result.skills || []);
        const updated = (result.skills || []).find((s) => s.name === skillData.name);
        if (updated) setSelectedSkill(updated);
        notify('技能已更新');
      } else {
        notify(result.error || '保存失败', 'error');
      }
    } catch (err) {
      notify('保存失败: ' + err.message, 'error');
    }
  }, [notify]);

  const handleDelete = useCallback(async (skillName) => {
    if (!confirm(`确定要删除技能 "${skillName}" 吗？`)) return;
    try {
      const result = await window.api.deleteSkill(skillName);
      if (result.success) {
        setSkills(result.skills || []);
        if (selectedSkill?.name === skillName) setSelectedSkill(null);
        notify('已删除');
      } else {
        notify(result.error || '删除失败', 'error');
      }
    } catch (err) {
      notify('删除失败: ' + err.message, 'error');
    }
  }, [notify, selectedSkill]);

  const handleToggle = useCallback(async (skillName, enabled) => {
    try {
      const result = await window.api.toggleSkill(skillName, enabled);
      if (result.success) {
        setSkills(result.skills || []);
        const updated = (result.skills || []).find((s) => s.name === skillName);
        if (updated) setSelectedSkill(updated);
        notify(enabled ? '已启用' : '已禁用');
      } else {
        notify(result.error || '操作失败', 'error');
      }
    } catch (err) {
      notify('操作失败: ' + err.message, 'error');
    }
  }, [notify]);

  const handleInstallZip = useCallback(async () => {
    try {
      const result = await window.api.installZip();
      if (result.success) {
        setSkills(result.skills || []);
        notify(`技能 "${result.installed}" 安装成功`);
      } else if (result.error !== '已取消') {
        notify(result.error || '安装失败', 'error');
      }
    } catch (err) {
      notify('安装失败: ' + err.message, 'error');
    }
  }, [notify]);

  const handleNewSkill = useCallback(() => {
    setIsCreating(true);
    setSelectedSkill({
      name: '',
      displayName: '',
      description: '',
      version: '1.0.0',
      author: '',
      triggers: [],
      content: '',
      enabled: true,
      path: '',
    });
  }, []);

  const handleCreateSkill = useCallback(async (skillData) => {
    try {
      const result = await window.api.saveSkill({
        ...skillData,
        name: skillData.name.trim().replace(/\s+/g, '-').toLowerCase(),
      });
      if (result.success) {
        setSkills(result.skills || []);
        const created = (result.skills || []).find((s) => s.name === skillData.name.trim().replace(/\s+/g, '-').toLowerCase());
        if (created) setSelectedSkill(created);
        setIsCreating(false);
        notify('技能已创建');
      } else {
        notify(result.error || '创建失败', 'error');
      }
    } catch (err) {
      notify('创建失败: ' + err.message, 'error');
    }
  }, [notify]);

  const filteredSkills = useMemo(() => {
    let filtered = [...skills];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        (s.displayName || s.name).toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.displayName || a.name).localeCompare(b.displayName || b.name);
        case 'installed': return new Date(b.installedAt || 0) - new Date(a.installedAt || 0);
        case 'author': return (a.author || '').localeCompare(b.author || '');
        case 'version': return (a.version || '0.0.0').localeCompare(b.version || '0.0.0');
        default: return 0;
      }
    });
    return filtered;
  }, [skills, searchQuery, sortBy]);

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onAdd={handleNewSkill}
        onInstallZip={handleInstallZip}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="main-layout">
        <div className="left-panel">
          <div className="left-toolbar">
            <div className="left-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={`搜索 ${skills.length} 个技能...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (setSearchQuery(''), e.target.blur())}
              />
              {searchQuery && (
                <button className="left-search-clear" onClick={() => setSearchQuery('')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <div className="left-sort">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="installed">更新时间</option>
                <option value="name">名称</option>
                <option value="author">作者</option>
                <option value="version">版本</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>加载中...</p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <EmptyState
              hasSearch={!!searchQuery.trim()}
              onAdd={handleNewSkill}
              onInstallZip={handleInstallZip}
            />
          ) : (
            <div className="skill-list">
              {filteredSkills.map((skill) => (
                <SkillListItem
                  key={skill.name}
                  skill={skill}
                  selected={selectedSkill?.name === skill.name}
                  onSelect={setSelectedSkill}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>

        <div className="right-panel">
          <SkillDetail
            skill={selectedSkill}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isCreating={isCreating}
            onCreate={handleCreateSkill}
            onCancelCreate={() => { setIsCreating(false); setSelectedSkill(null); }}
          />
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          currentDir={skillsDir}
          onSave={async (newDir) => {
            await window.api.setSkillsDir(newDir);
            setSkillsDir(newDir);
            setShowSettings(false);
            notify('配置已保存');
            loadSkills();
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
