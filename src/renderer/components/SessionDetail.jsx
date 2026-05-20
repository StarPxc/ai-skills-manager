import React, { useState, useEffect } from 'react';

function formatFullDate(ts) {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTokens(n) {
  if (!n || n === 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

function renderOpencodePart(part) {
  const d = part.parsedData || {};
  switch (d.type) {
    case 'text':
      return (
        <div className="session-msg-text">
          <pre>{d.text || ''}</pre>
        </div>
      );
    case 'reasoning':
      return (
        <details className="session-reasoning">
          <summary>思考过程</summary>
          <pre>{d.text || ''}</pre>
        </details>
      );
    case 'tool':
      return (
        <details className="session-tool">
          <summary>
            <span className="session-tool-name">{d.tool || 'tool'}</span>
            {d.state?.status === 'completed' && <span className="session-tool-status ok">完成</span>}
            {d.state?.status === 'errored' && <span className="session-tool-status err">失败</span>}
          </summary>
          <div className="session-tool-input">
            <strong>输入:</strong>
            <pre>{d.state?.input ? JSON.stringify(d.state.input, null, 2) : '(无)'}</pre>
          </div>
          {d.state?.output && (
            <div className="session-tool-output">
              <strong>输出:</strong>
              <pre>{typeof d.state.output === 'string' ? d.state.output : JSON.stringify(d.state.output, null, 2)}</pre>
            </div>
          )}
        </details>
      );
    case 'step-start':
      return <div className="session-step-marker">--- step start ---</div>;
    case 'step-finish':
      return <div className="session-step-marker">--- step finish ---</div>;
    default:
      return null;
  }
}

function renderClaudeContent(content) {
  if (typeof content === 'string') {
    return (
      <div className="session-msg-text">
        <pre>{content}</pre>
      </div>
    );
  }

  if (!Array.isArray(content)) return null;

  return content.map((c, i) => {
    if (!c || typeof c !== 'object') return null;
    switch (c.type) {
      case 'text':
        return (
          <div key={i} className="session-msg-text">
            <pre>{c.text || ''}</pre>
          </div>
        );
      case 'thinking':
        return (
          <details key={i} className="session-reasoning">
            <summary>思考过程</summary>
            <pre>{c.thinking || c.text || ''}</pre>
          </details>
        );
      case 'tool_use':
        return (
          <details key={i} className="session-tool">
            <summary>
              <span className="session-tool-name">{c.name || 'tool'}</span>
            </summary>
            <div className="session-tool-input">
              <strong>输入:</strong>
              <pre>{c.input ? JSON.stringify(c.input, null, 2) : '(无)'}</pre>
            </div>
          </details>
        );
      case 'tool_result':
        return (
          <details key={i} className="session-tool">
            <summary>
              <span className="session-tool-name">tool_result</span>
              {c.is_error && <span className="session-tool-status err">失败</span>}
            </summary>
            <div className="session-tool-output">
              <strong>输出:</strong>
              <pre>{typeof c.content === 'string' ? c.content : JSON.stringify(c.content || {}, null, 2)}</pre>
            </div>
          </details>
        );
      default:
        return null;
    }
  });
}

function renderOpencodeMessages(messages, copiedIndex, onCopy) {
  return messages.map((msg, idx) => {
    const role = msg.parsedData?.role || 'unknown';
    const parts = msg.parts || [];
    const hasContent = parts.some((p) =>
      ['text', 'reasoning', 'tool'].includes(p.parsedData?.type)
    );
    if (!hasContent) return null;

    return (
      <div key={msg.id} className={`session-msg ${role}`}>
        <div className="session-msg-header">
          <span className="session-msg-role">
            {role === 'user' ? '你' : role === 'assistant' ? '助手' : role}
          </span>
          {msg.parsedData?.model?.modelID && (
            <span className="session-msg-model">{msg.parsedData.model.modelID}</span>
          )}
          {msg.parsedData?.tokens && (
            <span className="session-msg-tokens">
              {formatTokens(msg.parsedData.tokens.total || 0)} tokens
            </span>
          )}
          <button
            className="session-msg-copy"
            onClick={() => {
              const text = parts
                .filter((p) => p.parsedData?.type === 'text')
                .map((p) => p.parsedData.text).join('\n');
              if (text) onCopy(text, idx);
            }}
          >
            {copiedIndex === idx ? '已复制' : '复制'}
          </button>
        </div>
        <div className="session-msg-body">
          {parts.map((part) => (
            <React.Fragment key={part.id}>
              {renderOpencodePart(part)}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  });
}

function renderClaudeMessages(messages, copiedIndex, onCopy) {
  return messages.map((msg, idx) => {
    if (!msg.content) return null;

    return (
      <div key={msg.id} className={`session-msg ${msg.role}`}>
        <div className="session-msg-header">
          <span className="session-msg-role">
            {msg.role === 'user' ? '你' : msg.role === 'assistant' ? '助手' : msg.role}
          </span>
          {msg.model && (
            <span className="session-msg-model">{msg.model}</span>
          )}
          {msg.usage && (
            <span className="session-msg-tokens">
              {(msg.usage.input_tokens || 0) + (msg.usage.output_tokens || 0)} tokens
            </span>
          )}
          <button
            className="session-msg-copy"
            onClick={() => {
              let text = '';
              if (typeof msg.content === 'string') {
                text = msg.content;
              } else if (Array.isArray(msg.content)) {
                text = msg.content
                  .filter((c) => c && c.type === 'text')
                  .map((c) => c.text).join('\n');
              }
              if (text) onCopy(text, idx);
            }}
          >
            {copiedIndex === idx ? '已复制' : '复制'}
          </button>
        </div>
        <div className="session-msg-body">
          {renderClaudeContent(msg.content)}
        </div>
      </div>
    );
  });
}

export default function SessionDetail({ sessionId, source, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(-1);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    setDetail(null);

    window.api.getSessionDetail(sessionId, source).then((result) => {
      if (result.success) {
        setDetail(result);
      } else {
        setError(result.error || '加载失败');
      }
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [sessionId, source]);

  if (!sessionId) {
    return (
      <div className="detail-empty">
        <svg viewBox="0 0 200 120" fill="none" width="160" height="96">
          <rect x="20" y="15" width="160" height="90" rx="10" fill="var(--bg-tertiary)" stroke="var(--border-primary)" strokeWidth="1.5" />
          <rect x="35" y="30" width="100" height="8" rx="4" fill="var(--accent)" opacity="0.25" />
          <rect x="35" y="46" width="80" height="6" rx="3" fill="var(--border-primary)" />
          <rect x="35" y="58" width="110" height="6" rx="3" fill="var(--border-primary)" />
          <rect x="35" y="70" width="70" height="6" rx="3" fill="var(--border-primary)" />
        </svg>
        <p>选择左侧会话查看详情</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="detail-empty">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-empty">
        <p style={{ color: 'var(--error)' }}>{error}</p>
      </div>
    );
  }

  if (!detail) return null;

  const { session, messages = [] } = detail;

  const handleExportHtml = async () => {
    setExporting(true);
    try {
      const result = await window.api.exportSessionHtml({
        title: session.title,
        time_created: session.time_created,
        model: session.model,
        source: source,
        messages: messages,
      });
      if (!result.success && result.error !== '已取消') {
        setError(result.error || '导出失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyMessage = async (text, idx) => {
    await window.api.copyToClipboard(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(-1), 1500);
  };

  const displayWorktree = session.project_worktree
    ? (session.project_worktree.replace(/^\/Users\/[^/]+/, '~') || session.project_worktree)
    : '';

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="detail-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18 }}>{session.title || '未命名会话'}</h2>
            <span className="detail-name-id">{formatFullDate(session.time_created)}</span>
          </div>
        </div>
        <div className="detail-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleExportHtml} disabled={exporting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {exporting ? '导出中...' : '导出 HTML'}
            </button>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-meta">
          {source === 'opencode' && (
            <>
              {session.model && <span className="skill-card-badge">{session.model}</span>}
              {session.agent && <span className="skill-card-badge">{session.agent}</span>}
            </>
          )}
          {session.model && source === 'claude' && (
            <span className="skill-card-badge">{session.model}</span>
          )}
          {session.cost > 0 && <span className="skill-card-badge" style={{ color: 'var(--accent)' }}>${Number(session.cost).toFixed(4)}</span>}
          {session.tokens_input > 0 && <span className="skill-card-badge">入 {formatTokens(session.tokens_input)}</span>}
          {session.tokens_output > 0 && <span className="skill-card-badge">出 {formatTokens(session.tokens_output)}</span>}
          {session.summary_additions > 0 && <span className="skill-card-badge">+{session.summary_additions}</span>}
          {session.summary_deletions > 0 && <span className="skill-card-badge" style={{ color: 'var(--error)' }}>-{session.summary_deletions}</span>}
          {session.summary_files > 0 && <span className="skill-card-badge">{session.summary_files}文件</span>}
          {displayWorktree && (
            <span className="skill-card-badge" style={{ fontFamily: 'monospace', fontSize: 10 }}>
              {displayWorktree}
            </span>
          )}
          {source === 'claude' && (
            <span className="skill-card-badge" style={{ background: 'var(--accent-mid)', color: 'var(--accent)' }}>
              Claude Code
            </span>
          )}
        </div>

        <div className="detail-section">
          <h3>对话记录 ({messages.length})</h3>
          <div className="session-messages">
            {source === 'claude'
              ? renderClaudeMessages(messages, copiedIndex, handleCopyMessage)
              : renderOpencodeMessages(messages, copiedIndex, handleCopyMessage)}
          </div>
        </div>
      </div>
    </div>
  );
}
