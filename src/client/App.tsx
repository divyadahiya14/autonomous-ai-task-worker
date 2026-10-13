import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { TaskInput } from './components/TaskInput.tsx';
import { PlanView } from './components/PlanView.tsx';
import { TraceView } from './components/TraceView.tsx';
import { HitlModal } from './components/HitlModal.tsx';
import { EvidenceView } from './components/EvidenceView.tsx';
import { ErpTwin } from './components/ErpTwin.tsx';
import { TaskStatus, PlanStep, ReActStep, HitlRequest, EvidenceDossier } from '../core/types.ts';
import { Terminal, Shield, Workflow } from 'lucide-react';

export const App: React.FC = () => {
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [engine, setEngine] = useState<string>('local');
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [steps, setSteps] = useState<ReActStep[]>([]);
  const [pendingHitl, setPendingHitl] = useState<HitlRequest | undefined>(undefined);
  const [dossier, setDossier] = useState<EvidenceDossier | null>(null);
  const [currentThought, setCurrentThought] = useState<{ stepNumber: number; thought: string } | undefined>(undefined);
  const [currentAction, setCurrentAction] = useState<{ stepNumber: number; tool: string; params: any } | undefined>(undefined);
  
  // Enterprise Twin State
  const [erpPayables, setErpPayables] = useState<any[]>([]);
  const [erpVendors, setErpVendors] = useState<any[]>([]);
  const [erpAudit, setErpAudit] = useState<any[]>([]);
  const [inboxDocs, setInboxDocs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Fetch full state from backend
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setPlan(data.plan || []);
        setSteps(data.steps || []);
        setPendingHitl(data.pendingHitl);
        if (data.erp) {
          setErpPayables(data.erp.payables || []);
          setErpVendors(data.erp.vendors || []);
          setErpAudit(data.erp.auditTrail || []);
        }
        if (data.inbox) setInboxDocs(data.inbox);
        if (data.notifications) setNotifications(data.notifications);
      }
    } catch (e) {
      console.warn('Initial state fetch error (server starting?):', e);
    }
  };

  useEffect(() => {
    fetchState();

    // Connect SSE Event Stream
    const eventSource = new EventSource('/api/task/events');

    eventSource.addEventListener('task_started', (e: any) => {
      setStatus('planning');
      setSteps([]);
      setDossier(null);
      setCurrentThought(undefined);
      setCurrentAction(undefined);
    });

    eventSource.addEventListener('plan_created', (e: any) => {
      const data = JSON.parse(e.data);
      setPlan(data.plan);
      setStatus('running');
    });

    eventSource.addEventListener('agent_thought', (e: any) => {
      const data = JSON.parse(e.data);
      setCurrentThought(data);
      setCurrentAction(undefined);
    });

    eventSource.addEventListener('tool_executing', (e: any) => {
      const data = JSON.parse(e.data);
      setCurrentAction(data);
    });

    eventSource.addEventListener('step_completed', (e: any) => {
      const step = JSON.parse(e.data);
      setSteps(prev => [...prev, step]);
      setCurrentThought(undefined);
      setCurrentAction(undefined);
      fetchState();
    });

    eventSource.addEventListener('hitl_requested', (e: any) => {
      const req = JSON.parse(e.data);
      setPendingHitl(req);
      setStatus('waiting_approval');
      fetchState();
    });

    eventSource.addEventListener('hitl_resolved', () => {
      setPendingHitl(undefined);
      setStatus('running');
      fetchState();
    });

    eventSource.addEventListener('task_dossier_ready', (e: any) => {
      const dos = JSON.parse(e.data);
      setDossier(dos);
      setStatus(dos.status);
      fetchState();
    });

    eventSource.addEventListener('environment_reset', () => {
      setStatus('idle');
      setPlan([]);
      setSteps([]);
      setDossier(null);
      setPendingHitl(undefined);
      setCurrentThought(undefined);
      setCurrentAction(undefined);
      fetchState();
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Run Task handler
  const handleRunTask = async (goal: string) => {
    setStatus('planning');
    setSteps([]);
    setDossier(null);
    try {
      await fetch('/api/task/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          config: { provider: engine }
        })
      });
    } catch (e) {
      console.error('Failed to trigger task:', e);
      setStatus('failed');
    }
  };

  // Human-In-The-Loop response
  const handleHitlRespond = async (approved: boolean, note?: string) => {
    if (!pendingHitl) return;
    try {
      await fetch('/api/task/hitl/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: pendingHitl.requestId,
          approved,
          userInput: note
        })
      });
      setPendingHitl(undefined);
    } catch (e) {
      console.error('Error resolving HITL:', e);
    }
  };

  // Environment Reset
  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        status={status}
        engine={engine}
        onEngineChange={setEngine}
        onReset={handleReset}
        isResetting={isResetting}
      />

      {/* 3-Column Dashboard Layout */}
      <main className="dashboard-grid">
        {/* Left Column: Command Center & Scenario Presets */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Terminal size={16} color="var(--accent-primary)" />
              Task Command Center
            </div>
          </div>
          <div className="panel-content">
            <TaskInput onRunTask={handleRunTask} status={status} />
          </div>
        </div>

        {/* Center Column: Execution Engine, Plan DAG, ReAct Trace & Evidence */}
        <div className="panel" style={{ background: 'var(--bg-primary)' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Workflow size={16} color="var(--accent-cyan)" />
              Autonomous Reasoning & Execution Core
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
              ReAct + Self-Healing + HITL
            </span>
          </div>

          <div className="panel-content" style={{ gap: 20 }}>
            {/* Plan DAG */}
            <PlanView plan={plan} />

            {/* Evidence Dossier (shows on completion or verification failure) */}
            {dossier && <EvidenceView dossier={dossier} />}

            {/* ReAct Thought & Action Feed */}
            <TraceView
              steps={steps}
              currentThought={currentThought}
              currentAction={currentAction}
            />
          </div>
        </div>

        {/* Right Column: Live Enterprise Twin (ERP, Inbox, Slack) */}
        <ErpTwin
          payables={erpPayables}
          vendors={erpVendors}
          auditTrail={erpAudit}
          inbox={inboxDocs}
          notifications={notifications}
        />
      </main>

      {/* Human-In-The-Loop Modal (Pops up when approval requested) */}
      {pendingHitl && (
        <HitlModal
          request={pendingHitl}
          onRespond={handleHitlRespond}
        />
      )}
    </div>
  );
};
