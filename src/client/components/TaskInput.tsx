import React, { useState } from 'react';
import { Play, Sparkles, AlertTriangle, Calendar, RefreshCcw, Layers } from 'lucide-react';
import { TaskStatus } from '../../core/types.ts';

interface TaskInputProps {
  onRunTask: (goal: string) => void;
  status: TaskStatus;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onRunTask, status }) => {
  const [goal, setGoal] = useState<string>(
    'Find the latest invoice from Acme Corp, extract the amount and due date, enter it into our internal system, and tell me once it is done.'
  );

  const scenarios = [
    {
      id: 'sc-1',
      title: 'Standard Invoice Flow',
      tag: 'Normal Workflow',
      icon: <Sparkles size={14} color="var(--accent-primary)" />,
      prompt: 'Find the latest invoice from Acme Corp, extract the amount and due date, enter it into our internal system, and tell me once it is done.',
      desc: 'Searches inbox, parses Acme invoice ($4,250), maps canonical vendor VEND-101, posts to ERP, verifies record.'
    },
    {
      id: 'sc-2',
      title: 'High-Value HITL Gate',
      tag: 'Safety Guardrail',
      icon: <AlertTriangle size={14} color="var(--accent-amber)" />,
      prompt: 'Process the high value hardware invoice from Cyberdyne Systems and record the payable in ERP.',
      desc: 'Amount is $14,500.00 (> $5,000 threshold). Triggers Human-In-The-Loop approval modal before writing to ledger.'
    },
    {
      id: 'sc-3',
      title: 'Net 30 Date Reasoning',
      tag: 'Autonomous Logic',
      icon: <Calendar size={14} color="var(--accent-cyan)" />,
      prompt: 'Process invoice from Stark Industries, compute due date from Net 30 terms, and register it in ERP.',
      desc: 'Invoice lacks explicit due date header. Agent reasons over Net 30 terms and issue date to compute exact ISO date.'
    },
    {
      id: 'sc-4',
      title: 'Self-Healing Recovery',
      tag: 'Error Matrix',
      icon: <RefreshCcw size={14} color="var(--accent-emerald)" />,
      prompt: 'Locate and enter the Initech Consulting invoice into our internal accounting system.',
      desc: 'Document date is in ambiguous format. When ERP throws format error, agent automatically self-heals and retries.'
    }
  ];

  const handleSelectScenario = (promptText: string) => {
    setGoal(promptText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || status === 'running' || status === 'planning') return;
    onRunTask(goal);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Natural Language Task Input Box */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label htmlFor="task-prompt-input" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Natural Language Goal
          </label>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Ctrl + Enter to run</span>
        </div>

        <textarea
          id="task-prompt-input"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Find the latest invoice from Company X, extract amount and due date, enter into our internal system, and notify me..."
          rows={4}
          style={{
            width: '100%',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 12,
            color: 'var(--text-main)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleSubmit(e);
            }
          }}
        />

        <button
          id="btn-run-agent"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!goal.trim() || status === 'running' || status === 'planning'}
        >
          <Play size={16} fill="white" />
          {status === 'running' || status === 'planning' ? 'Agent Executing...' : 'Launch AI Worker'}
        </button>
      </div>

      {/* Preset Scenarios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={14} color="var(--text-subtle)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Test Scenarios & Guardrails
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              id={`scenario-card-${sc.id}`}
              className={`scenario-card ${goal === sc.prompt ? 'active' : ''}`}
              onClick={() => handleSelectScenario(sc.prompt)}
            >
              <div className="scenario-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {sc.icon}
                  {sc.title}
                </span>
                <span className="scenario-tag">{sc.tag}</span>
              </div>
              <p className="scenario-desc">{sc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
