import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { HitlRequest } from '../../core/types.ts';

interface HitlModalProps {
  request: HitlRequest;
  onRespond: (approved: boolean, note?: string) => void;
}

export const HitlModal: React.FC<HitlModalProps> = ({ request, onRespond }) => {
  const [note, setNote] = useState<string>('Manager sign-off granted via executive dashboard');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleDecision = (approved: boolean) => {
    setIsSubmitting(true);
    onRespond(approved, note);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ border: '1px solid var(--accent-amber)' }}>
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.1)', 
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)', 
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.2)', 
            padding: 8, 
            borderRadius: 8,
            color: 'var(--accent-amber)'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fef3c7' }}>
              Human-in-the-Loop Approval Required
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#fde68a' }}>
              Agent execution paused safely by policy guardrail
            </p>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Reason Card */}
          <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={14} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Policy Trigger Reason
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
              {request.reason}
            </p>
          </div>

          {/* Proposed Action */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Pending Transaction Action
            </span>
            <div style={{ marginTop: 6 }}>
              <pre className="code-box">
                {JSON.stringify(request.proposedAction, null, 2)}
              </pre>
            </div>
          </div>

          {/* Manager Note Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="hitl-note-input" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Supervisor / Manager Authorization Note
            </label>
            <input
              id="hitl-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Budget approved under Q4 hardware capital plan"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              id="btn-hitl-reject"
              className="btn btn-danger"
              onClick={() => handleDecision(false)}
              disabled={isSubmitting}
            >
              <XCircle size={16} />
              Reject & Abort
            </button>
            <button
              id="btn-hitl-approve"
              className="btn btn-success"
              onClick={() => handleDecision(true)}
              disabled={isSubmitting}
            >
              <CheckCircle size={16} />
              Authorize & Resume Execution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
