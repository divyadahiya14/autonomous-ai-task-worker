import express, { Request, Response } from 'express';
import cors from 'cors';
import { AutonomousAgent } from '../core/agent.ts';
import { defaultErp } from '../env/erp.ts';
import { defaultInbox } from '../env/inbox.ts';
import { defaultNotifications } from '../env/notifications.ts';
import { defaultLLMEngine } from '../core/llm.ts';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let currentAgent = new AutonomousAgent();
const sseClients: Response[] = [];

// Broadcast helper for SSE
function broadcastSSE(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

// Connect agent events to SSE broadcaster
function attachAgentListeners(agent: AutonomousAgent) {
  agent.addListener((event, payload) => {
    broadcastSSE(event, payload);
  });
}

attachAgentListeners(currentAgent);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Current System State
app.get('/api/state', (req: Request, res: Response) => {
  res.json({
    status: currentAgent.getStatus(),
    plan: currentAgent.getPlan(),
    steps: currentAgent.getSteps(),
    memory: currentAgent.getMemory(),
    pendingHitl: currentAgent.getPendingHitl(),
    erp: {
      payables: defaultErp.listPayables(),
      vendors: defaultErp.listVendors(),
      auditTrail: defaultErp.getAuditTrail().slice(0, 15)
    },
    inbox: defaultInbox.listDocuments(),
    notifications: defaultNotifications.listMessages()
  });
});

// SSE Stream for Real-Time Event Updates
app.get('/api/task/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// Run a new autonomous task
app.post('/api/task/run', async (req: Request, res: Response) => {
  const { goal, config } = req.body;
  if (!goal) {
    return res.status(400).json({ error: 'Goal is required.' });
  }

  if (config) {
    defaultLLMEngine.setConfig(config);
  }

  // Create fresh agent instance for the new task
  currentAgent = new AutonomousAgent();
  attachAgentListeners(currentAgent);

  // Return immediately with accepted status, agent runs asynchronously while streaming via SSE
  res.json({
    status: 'started',
    goal
  });

  try {
    const dossier = await currentAgent.runTask(goal);
    broadcastSSE('task_dossier_ready', dossier);
  } catch (err: any) {
    console.error('Task execution error:', err);
    broadcastSSE('task_error', { error: err.message });
  }
});

// Resolve Human-In-The-Loop Approval
app.post('/api/task/hitl/respond', async (req: Request, res: Response) => {
  const { requestId, approved, userInput } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required.' });
  }

  try {
    const dossier = await currentAgent.resumeWithHitlDecision({
      requestId,
      approved: Boolean(approved),
      userInput
    });
    res.json({ success: true, dossier });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reset simulation environment to initial state
app.post('/api/reset', (req: Request, res: Response) => {
  defaultErp.reset();
  defaultNotifications.reset();
  currentAgent = new AutonomousAgent();
  attachAgentListeners(currentAgent);
  broadcastSSE('environment_reset', { resetAt: new Date().toISOString() });
  res.json({ success: true, message: 'Simulated environment reset to seed state.' });
});

// ERP & Inbox data endpoints
app.get('/api/erp/payables', (req: Request, res: Response) => {
  res.json(defaultErp.listPayables());
});

app.get('/api/erp/vendors', (req: Request, res: Response) => {
  res.json(defaultErp.listVendors());
});

app.get('/api/erp/audit', (req: Request, res: Response) => {
  res.json(defaultErp.getAuditTrail());
});

app.get('/api/inbox/documents', (req: Request, res: Response) => {
  res.json(defaultInbox.listDocuments());
});

app.listen(port, () => {
  console.log(`AutoWorker API Server listening at http://localhost:${port}`);
});
