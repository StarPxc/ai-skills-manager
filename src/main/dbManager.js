const path = require('path');
const os = require('os');

const DB_PATH = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

let db = null;

function getDb() {
  if (db) return db;
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');
  return db;
}

function getSessions() {
  const database = getDb();
  const rows = database.prepare(`
    SELECT s.id, s.title, s.time_created, s.time_updated, s.cost,
           s.tokens_input, s.tokens_output, s.model, s.agent, s.slug,
           s.summary_additions, s.summary_deletions, s.summary_files,
           p.worktree as project_worktree, p.name as project_name
    FROM session s
    LEFT JOIN project p ON s.project_id = p.id
    ORDER BY s.time_created DESC
  `).all();
  return rows;
}

function getSession(id) {
  const database = getDb();
  const row = database.prepare(`
    SELECT s.*, p.worktree as project_worktree, p.name as project_name
    FROM session s
    LEFT JOIN project p ON s.project_id = p.id
    WHERE s.id = ?
  `).get(id);
  return row || null;
}

function getSessionMessages(sessionId) {
  const database = getDb();
  const messages = database.prepare(`
    SELECT id, session_id, time_created, time_updated, data
    FROM message
    WHERE session_id = ?
    ORDER BY time_created ASC
  `).all(sessionId);
  return messages;
}

function getMessageParts(messageId) {
  const database = getDb();
  const parts = database.prepare(`
    SELECT id, message_id, session_id, time_created, time_updated, data
    FROM part
    WHERE message_id = ?
    ORDER BY time_created ASC
  `).all(messageId);
  return parts;
}

function getSessionShare(sessionId) {
  const database = getDb();
  const row = database.prepare(`
    SELECT * FROM session_share WHERE session_id = ?
  `).get(sessionId);
  return row || null;
}

function searchSessions(query) {
  const database = getDb();
  const like = `%${query}%`;
  const sessions = database.prepare(`
    SELECT s.id, s.title, s.time_created, s.time_updated, s.cost,
           s.tokens_input, s.tokens_output, s.model, p.worktree as project_worktree
    FROM session s
    LEFT JOIN project p ON s.project_id = p.id
    WHERE s.title LIKE ? OR s.slug LIKE ?
    ORDER BY s.time_created DESC
    LIMIT 100
  `).all(like, like);

  return sessions;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  DB_PATH,
  getSessions,
  getSession,
  getSessionMessages,
  getMessageParts,
  getSessionShare,
  searchSessions,
  closeDb,
};
