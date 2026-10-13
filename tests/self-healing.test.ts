import { describe, it, expect, beforeEach } from 'vitest';
import { defaultErp } from '../src/env/erp.ts';
import { defaultInbox } from '../src/env/inbox.ts';
import { defaultToolRegistry } from '../src/core/tools.ts';
import { MemoryStore } from '../src/core/memory.ts';

describe('Self-Healing & Error Recovery Matrix', () => {
  beforeEach(() => {
    defaultErp.reset();
  });

  it('detects ERP invalid date format error and successfully self-heals using reformat_date', async () => {
    const memoryStore = new MemoryStore('Test self healing');
    const memory = memoryStore.getMemory();

    const enterTool = defaultToolRegistry.getTool('enter_payable')!;
    const reformatTool = defaultToolRegistry.getTool('reformat_date')!;

    // 1. Initial attempt with regional US format "10/31/2026"
    const failureResult = await enterTool.execute({
      vendorId: 'VEND-101',
      invoiceNumber: 'INV-TEST-ERR-1',
      amount: 1500,
      dueDate: '10/31/2026'
    }, memory);

    // Expect system failure detection
    expect(failureResult.success).toBe(false);
    expect(failureResult.error).toContain('ERROR_INVALID_DATE_FORMAT');

    // 2. Self-healing tool invocation
    const healResult = await reformatTool.execute({
      dateStr: '10/31/2026'
    }, memory);

    expect(healResult.success).toBe(true);
    expect(healResult.data.formattedDate).toBe('2026-10-31');

    // 3. Retry with corrected ISO date format
    const retryResult = await enterTool.execute({
      vendorId: 'VEND-101',
      invoiceNumber: 'INV-TEST-ERR-1',
      amount: 1500,
      dueDate: healResult.data.formattedDate
    }, memory);

    expect(retryResult.success).toBe(true);
    expect(retryResult.data.id).toBeDefined();
    expect(retryResult.data.status).toBe('ENTERED');
  });

  it('detects raw vendor name mismatch and recovers via canonical vendor lookup', async () => {
    const memoryStore = new MemoryStore('Test vendor resolution');
    const memory = memoryStore.getMemory();

    const enterTool = defaultToolRegistry.getTool('enter_payable')!;
    const lookupTool = defaultToolRegistry.getTool('lookup_vendor')!;

    // 1. Attempt with raw non-canonical vendor name "Acme Corporation"
    const failureResult = await enterTool.execute({
      vendorId: 'Acme Corporation',
      invoiceNumber: 'INV-TEST-ERR-2',
      amount: 800,
      dueDate: '2026-11-30'
    }, memory);

    expect(failureResult.success).toBe(false);
    expect(failureResult.error).toContain('ERROR_INVALID_VENDOR_CODE');

    // 2. Recovery: look up canonical ID in ERP directory
    const lookupResult = await lookupTool.execute({
      query: 'Acme Corporation'
    }, memory);

    expect(lookupResult.success).toBe(true);
    expect(lookupResult.data.vendorId).toBe('VEND-101');

    // 3. Retry with canonical VEND-101
    const retryResult = await enterTool.execute({
      vendorId: lookupResult.data.vendorId,
      invoiceNumber: 'INV-TEST-ERR-2',
      amount: 800,
      dueDate: '2026-11-30'
    }, memory);

    expect(retryResult.success).toBe(true);
    expect(retryResult.data.vendorId).toBe('VEND-101');
  });

  it('rejects duplicate invoices to prevent accidental double-payment', async () => {
    const memoryStore = new MemoryStore('Test duplicate protection');
    const memory = memoryStore.getMemory();
    const enterTool = defaultToolRegistry.getTool('enter_payable')!;

    // Post invoice once
    const firstResult = await enterTool.execute({
      vendorId: 'VEND-101',
      invoiceNumber: 'INV-DUP-999',
      amount: 500,
      dueDate: '2026-12-01'
    }, memory);
    expect(firstResult.success).toBe(true);

    // Attempt to post exact same invoice number
    const secondResult = await enterTool.execute({
      vendorId: 'VEND-101',
      invoiceNumber: 'INV-DUP-999',
      amount: 500,
      dueDate: '2026-12-01'
    }, memory);

    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toContain('ERROR_DUPLICATE_INVOICE');
  });
});
