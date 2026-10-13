import React, { useEffect, useRef } from 'react';
import { Brain, Zap, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ReActStep } from '../../core/types.ts';

interface TraceViewProps {
  steps: ReActStep[];
  currentThought?: { stepNumber: number; thought: string };
  currentAction?: { stepNumber: number; tool: string; params: any };
}

export const TraceView: React.FC<TraceViewProps> = ({
  steps,
  currentThought,
  currentAction
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps, currentThought, currentAction]);

  if (steps.length === 0 && !currentThought && !currentAction) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-subtle)' }}>
        <p style={{ fontSize: '0.85rem' }}>Awaiting execution. Agent ReAct loop thoughts and actions will stream here live.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ReAct Execution Trace (Thought &rarr; Action &rarr; Observation)
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
          {steps.length} actions executed
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((step) => (
          <div key={step.stepNumber} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                STEP {step.stepNumber}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Thought */}
            <div className="trace-card thought">
              <div className="trace-label" style={{ color: 'var(--accent-primary)' }}>
                <Brain size={14} /> Agent Reasoning
              </div>
              <p style={{ color: 'var(--text-main)', lineHeight: 1.45 }}>{step.thought}</p>
            </div>

            {/* Action */}
            <div className="trace-card action">
              <div className="trace-label" style={{ color: 'var(--accent-cyan)' }}>
                <Zap size={14} /> Tool Action: <span style={{ fontFamily: 'var(--font-mono)' }}>{step.action.tool}</span>
              </div>
              <pre className="code-box">
                {JSON.stringify(step.action.params, null, 2)}
              </pre>
            </div>

            {/* Observation */}
            <div className={`trace-card ${step.observation.success ? 'observation-success' : 'observation-failure'}`}>
              <div className="trace-label" style={{ color: step.observation.success ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {step.observation.success ? (
                  <>
                    <CheckCircle size={14} /> Observation: Success
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} /> Observation: Error Detected
                  </>
                )}
              </div>

              {step.observation.success ? (
                <pre className="code-box">
                  {JSON.stringify(step.observation.data, null, 2)}
                </pre>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ color: '#fda4af', fontWeight: 500 }}>{step.observation.error}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 4 }}>
                    <RefreshCw size={12} />
                    Agent will analyze failure and attempt an adaptive fallback or retry.
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live streaming active step if in flight */}
        {currentThought && (
          <div className="trace-card thought" style={{ borderStyle: 'dashed' }}>
            <div className="trace-label" style={{ color: 'var(--accent-primary)' }}>
              <Brain size={14} className="spin" /> Reasoning in Progress (Step {currentThought.stepNumber})...
            </div>
            <p style={{ color: 'var(--text-main)' }}>{currentThought.thought}</p>
          </div>
        )}

        {currentAction && (
          <div className="trace-card action" style={{ borderStyle: 'dashed' }}>
            <div className="trace-label" style={{ color: 'var(--accent-cyan)' }}>
              <Zap size={14} /> Executing Tool: {currentAction.tool}...
            </div>
            <pre className="code-box">{JSON.stringify(currentAction.params, null, 2)}</pre>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
};
