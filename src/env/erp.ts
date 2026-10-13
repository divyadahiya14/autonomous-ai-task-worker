export interface VendorRecord {
  vendorId: string;
  name: string;
  aliases: string[];
  taxId: string;
  category: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'INACTIVE';
  paymentTerms: string;
  paymentMethod: 'ACH' | 'WIRE' | 'CHECK';
}

export interface PayableRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'ENTERED' | 'APPROVED' | 'PAID' | 'REJECTED';
  approvedBy?: string;
  createdAt: string;
  sourceDoc?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: Record<string, any>;
  status: 'SUCCESS' | 'ERROR' | 'FLAGGED';
}

export class ApexErp {
  private vendors: VendorRecord[] = [
    {
      vendorId: 'VEND-101',
      name: 'Acme Corporation',
      aliases: ['Acme', 'Acme Corp', 'Acme Inc'],
      taxId: 'US-9912048',
      category: 'Software & Cloud Services',
      status: 'ACTIVE',
      paymentTerms: 'Net 30',
      paymentMethod: 'ACH'
    },
    {
      vendorId: 'VEND-102',
      name: 'Globex Corporation',
      aliases: ['Globex', 'Globex Cloud'],
      taxId: 'US-8823194',
      category: 'IT Hosting & Infrastructure',
      status: 'ACTIVE',
      paymentTerms: 'Net 30',
      paymentMethod: 'ACH'
    },
    {
      vendorId: 'VEND-103',
      name: 'Cyberdyne Systems LLC',
      aliases: ['Cyberdyne', 'Cyberdyne Robotics'],
      taxId: 'US-7719201',
      category: 'Hardware & Automation',
      status: 'ACTIVE',
      paymentTerms: 'Net 15',
      paymentMethod: 'WIRE'
    },
    {
      vendorId: 'VEND-104',
      name: 'Stark Industries Inc',
      aliases: ['Stark', 'Stark Industries'],
      taxId: 'US-1120938',
      category: 'Energy & Advanced Tech',
      status: 'ACTIVE',
      paymentTerms: 'Net 30',
      paymentMethod: 'ACH'
    },
    {
      vendorId: 'VEND-105',
      name: 'Initech Consulting',
      aliases: ['Initech', 'Initech LLC'],
      taxId: 'US-5541920',
      category: 'Management & IT Services',
      status: 'ACTIVE',
      paymentTerms: 'Net 30',
      paymentMethod: 'ACH'
    }
  ];

  private payables: PayableRecord[] = [
    {
      id: 'AP-1001',
      vendorId: 'VEND-101',
      vendorName: 'Acme Corporation',
      invoiceNumber: 'INV-ACME-2026-08',
      amount: 4100.00,
      currency: 'USD',
      issueDate: '2026-09-01',
      dueDate: '2026-09-30',
      status: 'PAID',
      approvedBy: 'FIN-MGR-01',
      createdAt: '2026-09-02T10:00:00.000Z',
      notes: 'Historical prior month invoice'
    }
  ];

  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.logAudit('SYSTEM_BOOT', 'system', { status: 'Apex ERP Online' }, 'SUCCESS');
  }

  public logAudit(action: string, actor: string, details: Record<string, any>, status: 'SUCCESS' | 'ERROR' | 'FLAGGED') {
    this.auditLogs.unshift({
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      status
    });
  }

  public lookupVendors(query: string): VendorRecord[] {
    const q = query.toLowerCase().trim();
    this.logAudit('VENDOR_LOOKUP', 'ai-worker', { query }, 'SUCCESS');
    return this.vendors.filter(v => 
      v.vendorId.toLowerCase() === q ||
      v.name.toLowerCase().includes(q) ||
      v.aliases.some(alias => alias.toLowerCase().includes(q)) ||
      v.taxId.toLowerCase().includes(q)
    );
  }

  public getVendorById(vendorId: string): VendorRecord | undefined {
    return this.vendors.find(v => v.vendorId.toUpperCase() === vendorId.toUpperCase());
  }

  public listVendors(): VendorRecord[] {
    return [...this.vendors];
  }

  public listPayables(): PayableRecord[] {
    return [...this.payables];
  }

  public getPayable(id: string): PayableRecord | undefined {
    return this.payables.find(p => p.id === id || p.invoiceNumber === id);
  }

  public createPayable(entry: {
    vendorId: string;
    invoiceNumber: string;
    amount: number;
    currency?: string;
    issueDate?: string;
    dueDate: string;
    sourceDoc?: string;
    notes?: string;
    approvalToken?: string;
  }): { success: boolean; data?: PayableRecord; error?: string; policyViolation?: boolean } {
    const { vendorId, invoiceNumber, amount, dueDate, issueDate, currency = 'USD', sourceDoc, notes, approvalToken } = entry;

    // 1. Validate Canonical Vendor ID
    const canonicalVendor = this.getVendorById(vendorId);
    if (!canonicalVendor) {
      // Check if user passed vendor name instead of vendorId
      const matched = this.lookupVendors(vendorId);
      let hint = '';
      if (matched.length > 0) {
        hint = ` Did you mean '${matched[0].vendorId}' (${matched[0].name})?`;
      }
      const err = `ERROR_INVALID_VENDOR_CODE: '${vendorId}' is not a valid canonical Vendor ID.${hint} Please call lookup_vendor to obtain the canonical ID (e.g., 'VEND-101').`;
      this.logAudit('CREATE_PAYABLE_FAILED', 'ai-worker', { error: err, entry }, 'ERROR');
      return { success: false, error: err };
    }

    // 2. Validate Date Format (Must be YYYY-MM-DD)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(dueDate)) {
      const err = `ERROR_INVALID_DATE_FORMAT: Due date '${dueDate}' is not in YYYY-MM-DD format. Expected standard ISO format (e.g. 2026-10-31).`;
      this.logAudit('CREATE_PAYABLE_FAILED', 'ai-worker', { error: err, entry }, 'ERROR');
      return { success: false, error: err };
    }

    // 3. Validate Amount
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      const err = `ERROR_INVALID_AMOUNT: Amount must be a positive number. Received: ${amount}`;
      this.logAudit('CREATE_PAYABLE_FAILED', 'ai-worker', { error: err, entry }, 'ERROR');
      return { success: false, error: err };
    }

    // 4. Duplicate Check
    const existing = this.payables.find(p => p.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase());
    if (existing) {
      const err = `ERROR_DUPLICATE_INVOICE: Invoice '${invoiceNumber}' has already been registered in Accounts Payable under record ${existing.id}.`;
      this.logAudit('CREATE_PAYABLE_FAILED', 'ai-worker', { error: err, entry }, 'ERROR');
      return { success: false, error: err };
    }

    // 5. High-Value Policy Check ($5,000 threshold requires approval token)
    if (amount > 5000 && !approvalToken) {
      const err = `POLICY_VIOLATION_HITL_REQUIRED: Invoice amount of $${amount.toFixed(2)} exceeds the automated threshold limit of $5,000.00. Human approval is strictly required before registering this payable.`;
      this.logAudit('CREATE_PAYABLE_FLAGGED', 'ai-worker', { reason: err, entry }, 'FLAGGED');
      return { success: false, error: err, policyViolation: true };
    }

    const newRecord: PayableRecord = {
      id: `AP-${1000 + this.payables.length + 1}`,
      vendorId: canonicalVendor.vendorId,
      vendorName: canonicalVendor.name,
      invoiceNumber: invoiceNumber.trim().toUpperCase(),
      amount,
      currency,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      dueDate,
      status: approvalToken ? 'APPROVED' : 'ENTERED',
      approvedBy: approvalToken || undefined,
      createdAt: new Date().toISOString(),
      sourceDoc,
      notes
    };

    this.payables.push(newRecord);
    this.logAudit('CREATE_PAYABLE_SUCCESS', 'ai-worker', { record: newRecord }, 'SUCCESS');

    return {
      success: true,
      data: newRecord
    };
  }

  public getAuditTrail(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  public reset() {
    this.payables = this.payables.slice(0, 1); // Keep the seed record
    this.auditLogs = [];
    this.logAudit('SYSTEM_RESET', 'system', { status: 'Database reset to initial state' }, 'SUCCESS');
  }
}

export const defaultErp = new ApexErp();
