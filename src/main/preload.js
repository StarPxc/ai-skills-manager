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
});
