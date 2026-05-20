const path = require('path');
const fs = require('fs');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');

function buildSessionIndex() {
  const index = new Map();
  if (!fs.existsSync(PROJECTS_DIR)) return index;

  const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const dir of dirs) {
    const files = fs.readdirSync(path.join(PROJECTS_DIR, dir.name))
      .filter((f) => f.endsWith('.jsonl'));
    for (const f of files) {
      const sid = f.replace('.jsonl', '');
      index.set(sid, {
        dir: dir.name,
        path: path.join(PROJECTS_DIR, dir.name, f),
      });
    }
  }
  return index;
}

function getSessions() {
  const sessionIndex = buildSessionIndex();
  const historyMap = new Map();

  if (fs.existsSync(HISTORY_FILE)) {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const sid = entry.sessionId;
        if (!sid) continue;
        if (!historyMap.has(sid)) {
          const fileInfo = sessionIndex.get(sid) || {};
          historyMap.set(sid, {
            id: sid,
            title: entry.display || '',
            project: entry.project || '',
            time_created: entry.timestamp || 0,
            source: 'claude',
            hasFile: sessionIndex.has(sid),
            filePath: fileInfo.path || '',
          });
        } else {
          const existing = historyMap.get(sid);
          if (entry.timestamp > existing.time_created) {
            existing.title = entry.display || existing.title;
            existing.project = entry.project || existing.project;
          }
        }
      } catch {}
    }
  }

  const result = Array.from(historyMap.values());

  for (const s of result) {
    if (s.hasFile && s.filePath) {
      try {
        const stat = fs.statSync(s.filePath);
        s.fileSize = stat.size;
        s.time_updated = stat.mtimeMs;
      } catch {}
    }
    if (!s.time_updated) s.time_updated = s.time_created;
  }

  result.sort((a, b) => b.time_created - a.time_created);
  return result;
}

function getSessionDetail(sessionId) {
  const sessionIndex = buildSessionIndex();
  const info = sessionIndex.get(sessionId);
  if (!info) return null;

  const sessionFile = info.path;

  const session = {
    id: sessionId,
    source: 'claude',
    title: '',
    project_worktree: '',
    model: '',
    tokens_input: 0,
    tokens_output: 0,
    time_created: 0,
    time_updated: 0,
  };

  const messages = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let firstTimestamp = null;
  let lastTimestamp = null;

  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      try {
        const d = JSON.parse(line);

        if (d.timestamp) {
          const ts = new Date(d.timestamp).getTime();
          if (!firstTimestamp || ts < firstTimestamp) firstTimestamp = ts;
          if (!lastTimestamp || ts > lastTimestamp) lastTimestamp = ts;
        }

        if (d.type === 'attachment' && !session.project_worktree && d.cwd) {
          session.project_worktree = d.cwd;
        }

        if (d.type === 'user' || d.type === 'assistant') {
          const msg = d.message || {};
          if (msg.model && !session.model) {
            session.model = msg.model;
          }
          if (msg.usage) {
            totalInputTokens += (msg.usage.input_tokens || 0);
            totalOutputTokens += (msg.usage.output_tokens || 0);
          }
          messages.push({
            id: d.uuid || `msg_${messages.length}`,
            type: d.type,
            role: msg.role || d.type,
            model: msg.model || '',
            usage: msg.usage || null,
            content: msg.content || null,
            timestamp: d.timestamp || null,
          });
        }
      } catch {}
    }
  } catch {}

  session.tokens_input = totalInputTokens;
  session.tokens_output = totalOutputTokens;
  session.time_created = firstTimestamp || 0;
  session.time_updated = lastTimestamp || 0;

  let userContent = '';
  for (const msg of messages) {
    if (msg.type === 'user' && msg.content) {
      if (typeof msg.content === 'string') {
        userContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        const texts = msg.content
          .filter((c) => c && c.type === 'text')
          .map((c) => c.text);
        userContent = texts.join(' ').trim();
      }
      if (userContent && !userContent.startsWith('<')) break;
    }
  }
  session.title = userContent ? userContent.slice(0, 100) : '';

  return { session, messages };
}

function searchSessions(query) {
  const all = getSessions();
  const q = query.toLowerCase();
  return all.filter((s) =>
    (s.title || '').toLowerCase().includes(q) ||
    (s.project || '').toLowerCase().includes(q)
  );
}

module.exports = {
  getSessions,
  getSessionDetail,
  searchSessions,
  HISTORY_FILE,
  PROJECTS_DIR,
};
