const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSkills: () => ipcRenderer.invoke('get-skills'),
  saveSkill: (skillData) => ipcRenderer.invoke('save-skill', skillData),
  deleteSkill: (skillName) => ipcRenderer.invoke('delete-skill', skillName),
  toggleSkill: (skillName, enabled) => ipcRenderer.invoke('toggle-skill', skillName, enabled),
  installZip: () => ipcRenderer.invoke('install-zip'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getSkillsDir: () => ipcRenderer.invoke('get-skills-dir'),
  setSkillsDir: (newPath) => ipcRenderer.invoke('set-skills-dir', newPath),
  getDefaultSkillsDir: () => ipcRenderer.invoke('get-default-skills-dir'),
  openSkillsDir: () => ipcRenderer.invoke('open-skills-dir'),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),
  translate: (text, apiKey) => ipcRenderer.invoke('translate', text, apiKey),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  openLog: () => ipcRenderer.invoke('open-log'),
  loadTranslation: (skillName) => ipcRenderer.invoke('load-translation', skillName),
  saveTranslation: (skillName, translated) => ipcRenderer.invoke('save-translation', skillName, translated),
  screenshot: () => ipcRenderer.invoke('screenshot'),
  syncSkills: (fromDir, toDir) => ipcRenderer.invoke('sync-skills', fromDir, toDir),
  exportZip: (skillNames) => ipcRenderer.invoke('export-zip', skillNames),
  getSessions: (source) => ipcRenderer.invoke('get-sessions', source),
  getSessionDetail: (sessionId, source) => ipcRenderer.invoke('get-session-detail', sessionId, source),
  createSessionShare: (sessionId, id, secret, url) => ipcRenderer.invoke('create-session-share', sessionId, id, secret, url),
  searchSessions: (query) => ipcRenderer.invoke('search-sessions', query),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  exportSessionHtml: (sessionData) => ipcRenderer.invoke('export-session-html', sessionData),
  rewatch: () => ipcRenderer.invoke('rewatch'),
  onSkillsChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('skills-changed', handler);
    return () => ipcRenderer.removeListener('skills-changed', handler);
  },
});
