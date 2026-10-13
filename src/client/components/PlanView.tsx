import React from 'react';
import { CheckCircle2, Clock, Loader2, XCircle, ArrowDown } from 'lucide-react';
import { PlanStep } from '../../core/types.ts';

interface PlanViewProps {
  plan: PlanStep[];
}

export const PlanView: React.FC<PlanViewProps> = ({ plan }) => {
  if (plan.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-subtle)' }}>
        <p style={{ fontSize: '0.85rem' }}>No active plan. Submit a task to trigger autonomous decomposition.</p>
      </div>
    );
  }

  const getStatusIcon = (status: PlanStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} color="var(--accent-emerald)" />;
      case 'in_progress':
        return <Loader2 size={18} color="var(--accent-amber)" className="spin" />;
      case 'failed':
        return <XCircle size={18} color="var(--accent-rose)" />;
      default:
        return <Clock size={18} color="var(--text-subtle)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Decomposed Plan ({plan.filter(p => p.status === 'completed').length}/{plan.length} Completed)
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={`plan-item ${step.status}`}>
              <div style={{ marginTop: 2 }}>{getStatusIcon(step.status)}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {idx + 1}. {step.title}
                  </span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: step.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : step.status === 'in_progress' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: step.status === 'completed' ? 'var(--accent-emerald)' : step.status === 'in_progress' ? 'var(--accent-amber)' : 'var(--text-subtle)'
                  }}>
                    {step.status.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {step.description}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {step.toolsNeeded.map((t) => (
                    <span key={t} style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4, color: '#93c5fd' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {idx < plan.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.3 }}>
                <ArrowDown size={14} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
