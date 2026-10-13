import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousAgent } from '../src/core/agent.ts';
import { defaultErp } from '../src/env/erp.ts';
import { defaultNotifications } from '../src/env/notifications.ts';

describe('Autonomous AI Task Worker Core', () => {
  beforeEach(() => {
    defaultErp.reset();
    defaultNotifications.reset();
  });

  it('autonomously completes the standard invoice processing goal with 100% verification', async () => {
    const agent = new AutonomousAgent();
    const goal = 'Find the latest invoice from Acme Corp, extract the amount and due date, enter it into our internal system, and tell me once it is done.';

    const dossier = await agent.runTask(goal);

    expect(dossier.status).toBe('completed');
    expect(dossier.verification.verified).toBe(true);
    expect(dossier.verification.score).toBe(100);
    expect(dossier.extractedEntities.invoiceNumber).toBe('INV-ACME-2026-09');
    expect(dossier.extractedEntities.amount).toBe(4250.00);
    expect(dossier.extractedEntities.canonicalVendorId).toBe('VEND-101');
    expect(dossier.extractedEntities.dueDate).toBe('2026-10-31');

    // Confirm ERP record exists
    const record = defaultErp.getPayable('INV-ACME-2026-09');
    expect(record).toBeDefined();
    expect(record?.amount).toBe(4250.00);
    expect(record?.vendorId).toBe('VEND-101');

    // Confirm notification was dispatched
    const notif = defaultNotifications.getLatestMessage();
    expect(notif).toBeDefined();
    expect(notif?.channel).toBe('#finance-ops');
  });

  it('autonomously handles missing due date via Net 30 calculation', async () => {
    const agent = new AutonomousAgent();
    const goal = 'Process the invoice from Stark Industries, compute the due date according to their terms, and register it in ERP.';

    // Need HITL approval because Stark amount is $8,750 (> $5,000)
    let hitlTriggered = false;
    agent.addListener(async (event, payload) => {
      if (event === 'hitl_requested') {
        hitlTriggered = true;
        await agent.resumeWithHitlDecision({
          requestId: payload.requestId,
          approved: true,
          userInput: 'CFO approval granted for Stark energy consulting'
        });
      }
    });

    const dossier = await agent.runTask(goal);

    expect(hitlTriggered).toBe(true);
    expect(dossier.status).toBe('completed');
    expect(dossier.extractedEntities.invoiceNumber).toBe('INV-STARK-3012');
    // Issue date is 2026-10-05 + 30 days = 2026-11-04
    expect(dossier.extractedEntities.dueDate).toBe('2026-11-04');
  });

  it('triggers Human-In-The-Loop when invoice exceeds high-value threshold ($5,000)', async () => {
    const agent = new AutonomousAgent();
    const goal = 'Process the high value equipment invoice from Cyberdyne Systems.';

    let hitlEvent: any = null;
    agent.addListener((event, payload) => {
      if (event === 'hitl_requested') {
        hitlEvent = payload;
      }
    });

    // Run without auto-approving
    const dossier = await agent.runTask(goal);

    expect(agent.getStatus()).toBe('waiting_approval');
    expect(hitlEvent).not.toBeNull();
    expect(hitlEvent.reason).toContain('exceeds automated threshold limit of $5,000.00');

    // Now resume with approval
    const finalDossier = await agent.resumeWithHitlDecision({
      requestId: hitlEvent.requestId,
      approved: true,
      userInput: 'Approved by Financial Controller'
    });

    expect(finalDossier.status).toBe('completed');
    expect(finalDossier.verification.verified).toBe(true);
    expect(finalDossier.extractedEntities.amount).toBe(14500.00);
  });
});
