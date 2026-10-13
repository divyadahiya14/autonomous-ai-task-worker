import { describe, it, expect, beforeEach } from 'vitest';
import { OutcomeVerifier } from '../src/core/verifier.ts';
import { MemoryStore } from '../src/core/memory.ts';
import { defaultErp } from '../src/env/erp.ts';
import { defaultNotifications } from '../src/env/notifications.ts';

describe('Independent Outcome Verifier', () => {
  beforeEach(() => {
    defaultErp.reset();
    defaultNotifications.reset();
  });

  it('fails verification and highlights discrepancies if record was not created', () => {
    const verifier = new OutcomeVerifier();
    const memoryStore = new MemoryStore('Audit non-existent invoice');
    memoryStore.setFact('extractedInvoiceNumber', 'INV-DOES-NOT-EXIST');
    memoryStore.setFact('extractedAmount', 1000);
    memoryStore.setFact('canonicalVendorId', 'VEND-101');

    const outcome = verifier.verify(memoryStore.getMemory());

    expect(outcome.verified).toBe(false);
    expect(outcome.score).toBeLessThan(100);

    const erpAssertion = outcome.assertions.find(a => a.description.includes('Apex ERP ledger'));
    expect(erpAssertion?.passed).toBe(false);
  });

  it('detects amount discrepancy between original invoice and ledger entry', () => {
    const verifier = new OutcomeVerifier();
    const memoryStore = new MemoryStore('Audit mismatched invoice');

    // Manually register an entry with altered amount ($500 instead of $1,000)
    defaultErp.createPayable({
      vendorId: 'VEND-101',
      invoiceNumber: 'INV-MISMATCH-1',
      amount: 500,
      dueDate: '2026-10-31'
    });

    memoryStore.setFact('extractedInvoiceNumber', 'INV-MISMATCH-1');
    memoryStore.setFact('extractedAmount', 1000); // Discrepancy!
    memoryStore.setFact('canonicalVendorId', 'VEND-101');
    memoryStore.setFact('extractedDueDate', '2026-10-31');

    const outcome = verifier.verify(memoryStore.getMemory());

    expect(outcome.verified).toBe(false);
    const amountAssertion = outcome.assertions.find(a => a.description.includes('Ledger payable amount'));
    expect(amountAssertion?.passed).toBe(false);
    expect(amountAssertion?.expected).toBe(1000);
    expect(amountAssertion?.actual).toBe(500);
  });

  it('passes and signs cryptographic receipt when all assertions match', () => {
    const verifier = new OutcomeVerifier();
    const memoryStore = new MemoryStore('Audit valid invoice');

    defaultErp.createPayable({
      vendorId: 'VEND-101',
      invoiceNumber: 'INV-VALID-1',
      amount: 2500,
      dueDate: '2026-11-15'
    });

    defaultNotifications.send({
      channel: '#finance-ops',
      recipient: 'Accounting',
      subject: 'Done',
      body: 'Invoice processed'
    });

    memoryStore.setFact('extractedInvoiceNumber', 'INV-VALID-1');
    memoryStore.setFact('extractedAmount', 2500);
    memoryStore.setFact('canonicalVendorId', 'VEND-101');
    memoryStore.setFact('extractedDueDate', '2026-11-15');

    const outcome = verifier.verify(memoryStore.getMemory());

    expect(outcome.verified).toBe(true);
    expect(outcome.score).toBe(100);
    expect(outcome.verificationSignature).toMatch(/^VERIFY-SIG-/);
  });
});
