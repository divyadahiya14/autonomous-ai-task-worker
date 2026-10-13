import React from 'react';
import { ShieldCheck, Check, AlertOctagon, Download, FileText, Hash, CheckCircle2 } from 'lucide-react';
import { EvidenceDossier } from '../../core/types.ts';

interface EvidenceViewProps {
  dossier: EvidenceDossier;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({ dossier }) => {
  const downloadReport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dossier, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `verification_report_${dossier.taskId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isSuccess = dossier.status === 'completed' && dossier.verification.verified;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, border: isSuccess ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)' }}>
      {/* Dossier Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isSuccess ? (
            <ShieldCheck size={22} color="var(--accent-emerald)" />
          ) : (
            <AlertOctagon size={22} color="var(--accent-rose)" />
          )}
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Execution & Outcome Verification Dossier
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Task {dossier.taskId} &bull; {new Date(dossier.verification.verifiedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 6,
            background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: isSuccess ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            border: isSuccess ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
            textTransform: 'uppercase'
          }}>
            Score: {dossier.verification.score}% {isSuccess ? 'VERIFIED' : 'FAILED'}
          </span>

          <button
            id="btn-download-report"
            className="btn btn-secondary btn-sm"
            onClick={downloadReport}
            title="Download JSON audit report"
          >
            <Download size={13} />
            Export JSON
          </button>
        </div>
      </div>

      {/* Summary */}
      <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, background: 'rgba(0,0,0,0.25)', padding: 10, borderRadius: 6 }}>
        {dossier.summary}
      </p>

      {/* Extracted Entities Grid */}
      <div>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Extracted Business Entities
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 6 }}>
          <div style={{ background: 'var(--bg-primary)', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Vendor / Canonical ID</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {dossier.extractedEntities.vendorName} ({dossier.extractedEntities.canonicalVendorId || 'Pending'})
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Invoice Number</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {dossier.extractedEntities.invoiceNumber}
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Amount</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              ${Number(dossier.extractedEntities.amount).toFixed(2)} {dossier.extractedEntities.currency}
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Due Date</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              {dossier.extractedEntities.dueDate}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Assertions */}
      <div>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Automated State Assertions ({dossier.verification.assertions.filter(a => a.passed).length}/{dossier.verification.assertions.length} Passed)
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {dossier.verification.assertions.map((a, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: 6, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {a.passed ? (
                  <CheckCircle2 size={14} color="var(--accent-emerald)" />
                ) : (
                  <AlertOctagon size={14} color="var(--accent-rose)" />
                )}
                <span style={{ color: 'var(--text-main)' }}>{a.description}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: a.passed ? 'var(--text-muted)' : 'var(--accent-rose)' }}>
                {typeof a.actual === 'object' ? JSON.stringify(a.actual) : String(a.actual)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cryptographic Proof Hashes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.72rem', color: 'var(--text-subtle)', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6 }}>
        <div>
          <span style={{ fontWeight: 600 }}>Proof Hash: </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#93c5fd' }}>{dossier.verification.verificationSignature}</span>
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Ledger Audit: </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#a7f3d0' }}>{dossier.auditReceipt.auditHash}</span>
        </div>
      </div>
    </div>
  );
};
