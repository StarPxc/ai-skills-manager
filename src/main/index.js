const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const skillsManager = require('./skillsManager');
const logger = require('./logger');
const dbManager = require('./dbManager');
const claudeSessionManager = require('./claudeSessionManager');

logger.info('=== App starting ===');
logger.info('Platform:', process.platform, 'Arch:', process.arch, 'Electron:', process.versions.electron);
logger.info('Skills dir:', skillsManager.getSkillsDirectory());

let mainWindow;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createWindow() {
  const preloadPath = path.join(__dirname, '..', 'renderer', 'main_window', 'preload.js');
  logger.info('Creating window, preload:', preloadPath, 'exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AI 工作台',
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

let watchers = [];

function startWatching() {
  stopWatching();
  const dirs = [skillsManager.getSkillsDirectory(), skillsManager.getDisabledSkillsDirectory()];
  let debounce = null;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const w = fs.watch(dir, { recursive: true }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('skills-changed');
          }
        }, 500);
      });
      watchers.push(w);
      logger.info('Watching:', dir);
    } catch (err) {
      logger.warn('Failed to watch:', dir, err.message);
    }
  }
}

function stopWatching() {
  watchers.forEach((w) => w.close());
  watchers = [];
}

startWatching();

ipcMain.handle('rewatch', () => {
  startWatching();
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
    const filePath = path.join(desktopPath, `AI工作台截图-${ts}.png`);

    fs.writeFileSync(filePath, image.toPNG());
    logger.info('screenshot saved:', filePath);
    return { success: true, path: filePath };
  } catch (err) {
    logger.error('screenshot failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync-skills', async (_event, fromDir, toDir) => {
  try {
    logger.info('sync-skills:', fromDir, '->', toDir);
    if (!fs.existsSync(fromDir)) return { success: false, error: '源目录不存在' };
    if (!fs.existsSync(toDir)) fs.mkdirSync(toDir, { recursive: true });

    let copied = 0;
    let skipped = 0;
    const entries = fs.readdirSync(fromDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const srcPath = path.join(fromDir, entry.name);
      const dstPath = path.join(toDir, entry.name);

      if (fs.existsSync(dstPath)) {
        skipped++;
        continue;
      }

      fs.cpSync(srcPath, dstPath, { recursive: true });
      copied++;
    }

    logger.info('sync-skills done:', copied, 'copied,', skipped, 'skipped');
    return { success: true, copied, skipped };
  } catch (err) {
    logger.error('sync-skills failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-zip', async (_event, skillNames) => {
  try {
    if (!skillNames || skillNames.length === 0) return { success: false, error: '未选择技能' };

    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出技能包',
      defaultPath: `skills-export-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP 文件', extensions: ['zip'] }],
    });

    if (result.canceled) return { success: false, error: '已取消' };

    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    const activeDir = skillsManager.getSkillsDirectory();
    const disabledDir = skillsManager.getDisabledSkillsDirectory();

    for (const name of skillNames) {
      let skillPath = path.join(activeDir, name);
      if (!fs.existsSync(skillPath)) skillPath = path.join(disabledDir, name);
      if (!fs.existsSync(skillPath)) continue;
      zip.addLocalFolder(skillPath, name);
    }

    zip.writeZip(result.filePath);
    logger.info('export-zip:', skillNames.length, 'skills to', result.filePath);
    return { success: true, path: result.filePath };
  } catch (err) {
    logger.error('export-zip failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-sessions', async (_event, source) => {
  try {
    if (source === 'claude') {
      return claudeSessionManager.getSessions();
    }
    return dbManager.getSessions();
  } catch (err) {
    logger.error('get-sessions failed:', err.message);
    return [];
  }
});

ipcMain.handle('get-session-detail', async (_event, sessionId, source) => {
  try {
    if (source === 'claude') {
      const result = claudeSessionManager.getSessionDetail(sessionId);
      if (!result) return { success: false, error: '会话不存在' };
      return { success: true, ...result };
    }

    const session = dbManager.getSession(sessionId);
    if (!session) return { success: false, error: '会话不存在' };

    const messages = dbManager.getSessionMessages(sessionId);
    const enriched = messages.map((msg) => {
      const data = JSON.parse(msg.data || '{}');
      const parts = dbManager.getMessageParts(msg.id);
      const parsedParts = parts.map((p) => {
        try { return { ...p, parsedData: JSON.parse(p.data || '{}') }; }
        catch { return { ...p, parsedData: {} }; }
      });
      return {
        ...msg,
        parsedData: data,
        parts: parsedParts,
      };
    });

    const share = dbManager.getSessionShare(sessionId);
    return { success: true, session, messages: enriched, share };
  } catch (err) {
    logger.error('get-session-detail failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-session-share', async (_event, sessionId, id, secret, url) => {
  try {
    const database = require('better-sqlite3')(dbManager.DB_PATH);
    const now = Date.now();
    database.prepare(`
      INSERT OR REPLACE INTO session_share (session_id, id, secret, url, time_created, time_updated)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, id, secret, url, now, now);
    database.close();
    clipboard.writeText(url);
    return { success: true, url };
  } catch (err) {
    logger.error('create-session-share failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('search-sessions', async (_event, query, source) => {
  try {
    if (source === 'claude') {
      return claudeSessionManager.searchSessions(query);
    }
    return dbManager.searchSessions(query);
  } catch (err) {
    logger.error('search-sessions failed:', err.message);
    return [];
  }
});

ipcMain.handle('copy-to-clipboard', async (_event, text) => {
  clipboard.writeText(text);
  return { success: true };
});

ipcMain.handle('export-session-html', async (_event, sessionData) => {
  try {
    const { title, time_created, model, source, messages } = sessionData;
    const dateStr = new Date(time_created).toLocaleString('zh-CN');

    let bodyHtml = '';
    for (const msg of messages) {
      const roleLabel = msg.role === 'user' ? '你' : msg.role === 'assistant' ? '助手' : msg.role;
      let contentHtml = '';

      if (source === 'claude') {
        if (typeof msg.content === 'string') {
          contentHtml = `<div class="text">${escapeHtml(msg.content)}</div>`;
        } else if (Array.isArray(msg.content)) {
          for (const c of msg.content) {
            if (!c) continue;
            if (c.type === 'text') {
              contentHtml += `<div class="text">${escapeHtml(c.text || '')}</div>`;
            } else if (c.type === 'thinking') {
              contentHtml += `<details class="thinking"><summary>思考过程</summary><pre>${escapeHtml(c.thinking || '')}</pre></details>`;
            } else if (c.type === 'tool_use') {
              contentHtml += `<details class="tool"><summary>🔧 ${escapeHtml(c.name || 'tool')}</summary><div class="tool-section"><strong>输入:</strong><pre>${escapeHtml(JSON.stringify(c.input || {}, null, 2))}</pre></div></details>`;
            } else if (c.type === 'tool_result') {
              const resultContent = typeof c.content === 'string' ? c.content : JSON.stringify(c.content || {}, null, 2);
              contentHtml += `<details class="tool"><summary>📋 tool_result${c.is_error ? ' ❌' : ''}</summary><div class="tool-section"><pre>${escapeHtml(resultContent)}</pre></div></details>`;
            }
          }
        }
      } else {
        const parts = msg.parts || [];
        for (const p of parts) {
          const d = p.parsedData || {};
          if (d.type === 'text') {
            contentHtml += `<div class="text">${escapeHtml(d.text || '')}</div>`;
          } else if (d.type === 'reasoning') {
            contentHtml += `<details class="thinking"><summary>思考过程</summary><pre>${escapeHtml(d.text || '')}</pre></details>`;
          } else if (d.type === 'tool') {
            contentHtml += `<details class="tool"><summary>🔧 ${escapeHtml(d.tool || 'tool')}</summary><div class="tool-section"><strong>输入:</strong><pre>${escapeHtml(JSON.stringify(d.state?.input || {}, null, 2))}</pre></div>`;
            if (d.state?.output) {
              contentHtml += `<div class="tool-section"><strong>输出:</strong><pre>${escapeHtml(typeof d.state.output === 'string' ? d.state.output : JSON.stringify(d.state.output, null, 2))}</pre></div>`;
            }
            contentHtml += `</details>`;
          }
        }
      }

      if (contentHtml) {
        bodyHtml += `
        <div class="msg ${msg.role}">
          <div class="msg-header"><span class="role">${roleLabel}</span></div>
          <div class="msg-body">${contentHtml}</div>
        </div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title || '会话')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.6}
.container{max-width:800px;margin:0 auto;padding:32px 24px}
.header{border-bottom:1px solid #e5e5ea;padding-bottom:20px;margin-bottom:28px}
.header h1{font-size:22px;font-weight:600;margin-bottom:8px}
.header .meta{font-size:13px;color:#86868b}
.header .meta span{display:inline-block;margin-right:16px}
.msg{background:#fff;border-radius:12px;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.msg.user{border-left:3px solid #0a84ff}
.msg.assistant{border-left:3px solid #30d158}
.msg-header{padding:10px 18px;background:#f5f5f7;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#6e6e73}
.msg-body{padding:16px 20px}
.text{white-space:pre-wrap;word-break:break-word;font-size:14px;margin-bottom:8px}
.text:last-child{margin-bottom:0}
.thinking{background:#f5f5f7;border-radius:8px;padding:12px 16px;margin:8px 0}
.thinking summary{font-size:12px;font-weight:600;color:#86868b;cursor:pointer}
.thinking pre{white-space:pre-wrap;font-size:13px;color:#6e6e73;margin-top:8px}
.tool{background:#f5f5f7;border-radius:8px;padding:12px 16px;margin:8px 0}
.tool summary{font-size:12px;font-weight:600;color:#0a84ff;cursor:pointer}
.tool-section{margin-top:10px}
.tool-section strong{font-size:11px;color:#86868b;display:block;margin-bottom:4px}
.tool-section pre{white-space:pre-wrap;word-break:break-word;font-size:12px;color:#1d1d1f;background:#fff;padding:10px 14px;border-radius:6px;max-height:300px;overflow-y:auto;font-family:'SF Mono',monospace}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${escapeHtml(title || '未命名会话')}</h1>
    <div class="meta">
      <span>${dateStr}</span>
      ${model ? `<span>${escapeHtml(model)}</span>` : ''}
      ${source ? `<span>来源: ${escapeHtml(source)}</span>` : ''}
    </div>
  </div>
  ${bodyHtml}
</div>
</body>
</html>`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出会话',
      defaultPath: `${(title || 'session').replace(/[\\/:*?"<>|]/g, '-').slice(0, 50)}.html`,
      filters: [{ name: 'HTML 文件', extensions: ['html'] }],
    });

    if (result.canceled) return { success: false, error: '已取消' };

    fs.writeFileSync(result.filePath, html, 'utf-8');
    logger.info('export-session-html saved:', result.filePath);
    return { success: true, path: result.filePath };
  } catch (err) {
    logger.error('export-session-html failed:', err.message);
    return { success: false, error: err.message };
  }
});
