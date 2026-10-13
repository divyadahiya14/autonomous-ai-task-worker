import React, { useState } from 'react';
import { Building2, Inbox, MessageSquare, FileText, CheckCircle2, Eye, ShieldAlert } from 'lucide-react';
import { PayableRecord, VendorRecord, AuditLogEntry } from '../../env/erp.ts';
import { NotificationMessage } from '../../env/notifications.ts';

interface ErpTwinProps {
  payables: PayableRecord[];
  vendors: VendorRecord[];
  auditTrail: AuditLogEntry[];
  inbox: Array<{ filename: string; vendorName: string; size: string }>;
  notifications: NotificationMessage[];
}

export const ErpTwin: React.FC<ErpTwinProps> = ({
  payables,
  vendors,
  auditTrail,
  inbox,
  notifications
}) => {
  const [activeTab, setActiveTab] = useState<'payables' | 'vendors' | 'inbox' | 'slack'>('payables');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  return (
    <div className="panel" style={{ background: 'var(--bg-secondary)' }}>
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title">
          <Building2 size={16} color="var(--accent-primary)" />
          Enterprise Twin (Live Systems)
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
          Apex ERP v3.4 &bull; Active
        </span>
      </div>

      {/* Tabs */}
      <div className="tabs-header">
        <button
          id="tab-btn-payables"
          className={`tab-btn ${activeTab === 'payables' ? 'active' : ''}`}
          onClick={() => setActiveTab('payables')}
        >
          Payables ({payables.length})
        </button>
        <button
          id="tab-btn-vendors"
          className={`tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          Vendors ({vendors.length})
        </button>
        <button
          id="tab-btn-inbox"
          className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          Inbox Files ({inbox.length})
        </button>
        <button
          id="tab-btn-slack"
          className={`tab-btn ${activeTab === 'slack' ? 'active' : ''}`}
          onClick={() => setActiveTab('slack')}
        >
          #finance-ops ({notifications.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="panel-content" style={{ padding: 12 }}>
        {/* Tab 1: Accounts Payable */}
        {activeTab === 'payables' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Vendor</th>
                    <th>Invoice #</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {p.id}
                      </td>
                      <td>{p.vendorName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{p.invoiceNumber}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        ${p.amount.toFixed(2)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {p.dueDate}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: p.status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'APPROVED' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: p.status === 'PAID' ? 'var(--accent-emerald)' : p.status === 'APPROVED' ? 'var(--accent-primary)' : 'var(--accent-amber)'
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Audit Trail Snippet */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                Live ERP Audit Log
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                {auditTrail.map((log) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: 4, fontSize: '0.72rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: log.status === 'SUCCESS' ? 'var(--accent-emerald)' : log.status === 'ERROR' ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--text-subtle)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Vendor Directory */}
        {activeTab === 'vendors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vendors.map((v) => (
              <div key={v.vendorId} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {v.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', borderRadius: 4 }}>
                    {v.vendorId}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Category: {v.category} &bull; Terms: {v.paymentTerms}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                  Tax ID: {v.taxId} | Aliases: {v.aliases.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Incoming Document Inbox */}
        {activeTab === 'inbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inbox.map((doc) => (
              <div key={doc.filename} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="var(--accent-cyan)" />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                      Vendor: {doc.vendorName} &bull; {doc.size}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Slack Channel */}
        {activeTab === 'slack' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <MessageSquare size={13} />
              Slack Channel: <strong>#finance-ops</strong>
            </div>

            {notifications.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', padding: 12, textAlign: 'center' }}>
                No messages dispatched yet.
              </p>
            ) : (
              notifications.map((msg) => (
                <div key={msg.id} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      {msg.subject}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {msg.body}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
