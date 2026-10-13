import React from 'react';
import { Bot, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';
import { TaskStatus } from '../../core/types.ts';

interface HeaderProps {
  status: TaskStatus;
  engine: string;
  onEngineChange: (engine: string) => void;
  onReset: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  engine,
  onEngineChange,
  onReset,
  isResetting
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Bot size={22} />
        </div>
        <div>
          <span className="brand-title">AutoWorker</span>
        </div>
        <span className="brand-badge">Autonomous Agent v1.0</span>
      </div>

      <div className="header-actions">
        {/* Engine selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <Cpu size={15} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Engine:</span>
          <select
            id="engine-selector"
            value={engine}
            onChange={(e) => onEngineChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="local" style={{ background: '#0f1422' }}>Embedded ReAct Engine (Offline/Deterministic)</option>
            <option value="gemini" style={{ background: '#0f1422' }}>Google Gemini 1.5</option>
            <option value="openai" style={{ background: '#0f1422' }}>OpenAI GPT-4o-mini</option>
          </select>
        </div>

        {/* Status Pill */}
        <div className={`status-pill ${status}`}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
          {status === 'waiting_approval' ? 'HITL Approval Needed' : status}
        </div>

        {/* Reset System Button */}
        <button
          id="btn-reset-simulation"
          className="btn btn-secondary btn-sm"
          onClick={onReset}
          disabled={isResetting}
          title="Reset ERP ledger and document states"
        >
          <RefreshCw size={14} className={isResetting ? 'spin' : ''} />
          Reset Environment
        </button>
      </div>
    </header>
  );
};
