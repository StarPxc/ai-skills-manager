const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const skillsManager = require('./skillsManager');
const logger = require('./logger');

logger.info('=== App starting ===');
logger.info('Platform:', process.platform, 'Arch:', process.arch, 'Electron:', process.versions.electron);
logger.info('Skills dir:', skillsManager.getSkillsDirectory());

let mainWindow;

function createWindow() {
  const preloadPath = path.join(__dirname, '..', 'renderer', 'main_window', 'preload.js');
  logger.info('Creating window, preload:', preloadPath, 'exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AI技能管理器',
    backgroundColor: '#fafafa',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process gone! Reason:', details.reason, 'Exit code:', details.exitCode);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error('Page load failed:', errorDescription, 'URL:', validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Page loaded successfully');
  });

  mainWindow.on('closed', () => {
    logger.info('Window closed');
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('Activating, creating new window');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

// IPC Handlers
ipcMain.handle('get-skills', async () => {
  try {
    const skills = await skillsManager.loadSkills();
    logger.info('get-skills:', skills.length, 'loaded');
    return skills;
  } catch (err) {
    logger.error('get-skills failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-skill', async (_event, skillData) => {
  try {
    logger.info('save-skill:', skillData.name);
    await skillsManager.saveSkill(skillData);
    const skills = await skillsManager.loadSkills();
    return { success: true, skills };
  } catch (err) {
    logger.error('save-skill failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-skill', async (_event, skillName) => {
  try {
    logger.info('delete-skill:', skillName);
    await skillsManager.deleteSkill(skillName);
    const skills = await skillsManager.loadSkills();
    return { success: true, skills };
  } catch (err) {
    logger.error('delete-skill failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('toggle-skill', async (_event, skillName, enabled) => {
  try {
    logger.info('toggle-skill:', skillName, enabled ? 'enable' : 'disable');
    await skillsManager.toggleSkill(skillName, enabled);
    const skills = await skillsManager.loadSkills();
    return { success: true, skills };
  } catch (err) {
    logger.error('toggle-skill failed:', skillName, err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('install-zip', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择技能包 (.zip)',
    filters: [{ name: 'ZIP 文件', extensions: ['zip'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: '已取消' };
  }

  try {
    const installed = await skillsManager.installFromZip(result.filePaths[0]);
    const skills = await skillsManager.loadSkills();
    return { success: true, installed, skills };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择技能文件夹',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: '已取消' };
  }

  const folderPath = result.filePaths[0];
  const skillInfo = skillsManager.readSkillInfo(folderPath);
  return { success: true, folderPath, skillInfo };
});

ipcMain.handle('get-skills-dir', async () => {
  const dir = skillsManager.getSkillsDirectory();
  return { path: dir, exists: fs.existsSync(dir) };
});

ipcMain.handle('set-skills-dir', async (_event, newPath) => {
  skillsManager.setSkillsDirectory(newPath);
  return { success: true };
});

ipcMain.handle('get-default-skills-dir', async () => {
  return skillsManager.getDefaultSkillsDirectory();
});

ipcMain.handle('open-skills-dir', async () => {
  const dir = skillsManager.getSkillsDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const { shell } = require('electron');
  await shell.openPath(dir);
});

ipcMain.handle('get-api-key', async () => {
  return skillsManager.getApiKey();
});

ipcMain.handle('set-api-key', async (_event, key) => {
  skillsManager.setApiKey(key);
  return { success: true };
});

ipcMain.handle('translate', async (_event, text, apiKey) => {
  if (!text || !text.trim()) {
    return { success: false, error: '没有可翻译的内容' };
  }
  if (!apiKey) {
    return { success: false, error: '请先在设置中配置 DeepSeek API Key' };
  }
  logger.info('translate: text length', text.length);

  const https = require('https');

  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: '你是一个专业的英译中翻译助手。请将以下英文技术文档翻译成中文，保持 Markdown 格式不变，专业术语翻译准确，语言流畅自然。只返回翻译结果，不要添加任何解释。' },
        { role: 'user', content: text },
      ],
      stream: false,
    });

    const req = https.request(
      {
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 60000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              logger.error('translate API error:', json.error.message);
              resolve({ success: false, error: json.error.message || 'API 调用失败' });
            } else if (json.choices && json.choices[0]) {
              logger.info('translate: success, response length', json.choices[0].message.content.length);
              resolve({ success: true, translated: json.choices[0].message.content });
            } else {
              logger.error('translate: unexpected response', data.substring(0, 200));
              resolve({ success: false, error: 'API 返回格式异常' });
            }
          } catch (err) {
            logger.error('translate: parse error', err.message);
            resolve({ success: false, error: '解析响应失败: ' + err.message });
          }
        });
      }
    );

    req.on('error', (err) => {
      logger.error('translate: network error', err.message);
      resolve({ success: false, error: '网络请求失败: ' + err.message });
    });
    req.on('timeout', () => {
      logger.error('translate: timeout');
      req.destroy();
      resolve({ success: false, error: '翻译超时（60秒）' });
    });

    req.write(body);
    req.end();
  });
});

ipcMain.handle('get-log-path', async () => {
  return logger.getPath();
});

ipcMain.handle('open-log', async () => {
  const { shell } = require('electron');
  await shell.openPath(logger.getPath());
});

ipcMain.handle('load-translation', async (_event, skillName) => {
  return skillsManager.loadTranslation(skillName);
});

ipcMain.handle('save-translation', async (_event, skillName, translated) => {
  try {
    logger.info('save-translation:', skillName, 'length:', translated?.length);
    skillsManager.saveTranslation(skillName, translated);
    return { success: true };
  } catch (err) {
    logger.error('save-translation failed:', skillName, err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('screenshot', async () => {
  try {
    if (!mainWindow) return { success: false, error: '无活动窗口' };

    const image = await mainWindow.webContents.capturePage();
    const desktopPath = app.getPath('desktop');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filePath = path.join(desktopPath, `AI技能管理器截图-${ts}.png`);

    fs.writeFileSync(filePath, image.toPNG());
    logger.info('screenshot saved:', filePath);
    return { success: true, path: filePath };
  } catch (err) {
    logger.error('screenshot failed:', err.message);
    return { success: false, error: err.message };
  }
});
