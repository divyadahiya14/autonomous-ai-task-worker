import { ToolDefinition, AgentMemory } from './types.ts';
import { defaultInbox } from '../env/inbox.ts';
import { defaultErp } from '../env/erp.ts';
import { defaultNotifications } from '../env/notifications.ts';

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'search_inbox',
    description: 'Search the document inbox, shared storage, or email attachments for invoices, vendor statements, or files.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Keywords, company name, invoice number, or file description to search for',
        required: true
      }
    ],
    execute: async (params: { query: string }) => {
      const results = defaultInbox.searchDocuments(params.query);
      if (results.length === 0) {
        return {
          success: false,
          error: `No documents found matching query: '${params.query}'`
        };
      }
      return {
        success: true,
        data: {
          matchCount: results.length,
          documents: results.map(d => ({
            filename: d.filename,
            vendorName: d.vendorName,
            invoiceNumber: d.invoiceNumber,
            amount: d.amount,
            issueDate: d.issueDate,
            snippet: d.rawText.slice(0, 150) + '...'
          }))
        }
      };
    }
  },
  {
    name: 'read_document',
    description: 'Open and read the complete text content and details of a specific document file from the inbox.',
    parameters: [
      {
        name: 'filename',
        type: 'string',
        description: 'The exact or partial filename of the document to inspect',
        required: true
      }
    ],
    execute: async (params: { filename: string }, memory: AgentMemory) => {
      const doc = defaultInbox.getDocumentByFilename(params.filename);
      if (!doc) {
        return {
          success: false,
          error: `Document file not found: '${params.filename}'. Try searching with search_inbox first.`
        };
      }

      // Automatically store observed facts into working memory
      memory.facts.lastDocumentRead = doc.filename;
      memory.facts.extractedVendor = doc.vendorName;
      memory.facts.extractedInvoiceNumber = doc.invoiceNumber;
      memory.facts.extractedAmount = doc.amount;
      memory.facts.extractedCurrency = doc.currency;
      memory.facts.extractedIssueDate = doc.issueDate;
      if (doc.dueDate) {
        memory.facts.extractedDueDate = doc.dueDate;
      }
      if (doc.paymentTerms) {
        memory.facts.extractedPaymentTerms = doc.paymentTerms;
      }
      memory.facts.extractedTaxId = doc.taxId;

      return {
        success: true,
        data: {
          filename: doc.filename,
          vendorName: doc.vendorName,
          invoiceNumber: doc.invoiceNumber,
          issueDate: doc.issueDate,
          dueDate: doc.dueDate,
          paymentTerms: doc.paymentTerms,
          amount: doc.amount,
          currency: doc.currency,
          taxId: doc.taxId,
          lineItems: doc.items,
          rawContent: doc.rawText
        }
      };
    }
  },
  {
    name: 'lookup_vendor',
    description: 'Search company ERP vendor directory by company name, alias, or tax ID to retrieve the canonical Vendor ID (e.g. VEND-101).',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The vendor name, alias, or tax ID',
        required: true
      }
    ],
    execute: async (params: { query: string }, memory: AgentMemory) => {
      const vendors = defaultErp.lookupVendors(params.query);
      if (vendors.length === 0) {
        return {
          success: false,
          error: `No vendor found matching query '${params.query}'. Consider searching for shorter keywords or aliases.`
        };
      }

      if (vendors.length === 1) {
        memory.facts.canonicalVendorId = vendors[0].vendorId;
        memory.facts.canonicalVendorName = vendors[0].name;
        return {
          success: true,
          data: {
            vendorId: vendors[0].vendorId,
            name: vendors[0].name,
            taxId: vendors[0].taxId,
            category: vendors[0].category,
            paymentTerms: vendors[0].paymentTerms
          }
        };
      }

      // If multiple vendors match, return options
      return {
        success: true,
        data: {
          multipleMatches: true,
          count: vendors.length,
          vendors: vendors.map(v => ({ vendorId: v.vendorId, name: v.name, taxId: v.taxId }))
        }
      };
    }
  },
  {
    name: 'enter_payable',
    description: 'Post an accounts payable invoice entry into the Apex Financial ERP system.',
    parameters: [
      {
        name: 'vendorId',
        type: 'string',
        description: 'Canonical Vendor ID in the ERP system (e.g. VEND-101)',
        required: true
      },
      {
        name: 'invoiceNumber',
        type: 'string',
        description: 'Unique invoice identifier (e.g. INV-ACME-2026-09)',
        required: true
      },
      {
        name: 'amount',
        type: 'number',
        description: 'Total payable amount as a positive number',
        required: true
      },
      {
        name: 'dueDate',
        type: 'string',
        description: 'Payment due date formatted as standard ISO YYYY-MM-DD',
        required: true
      },
      {
        name: 'issueDate',
        type: 'string',
        description: 'Invoice issue date formatted as standard ISO YYYY-MM-DD',
        required: false
      },
      {
        name: 'notes',
        type: 'string',
        description: 'Optional reference notes or line item details',
        required: false
      },
      {
        name: 'approvalToken',
        type: 'string',
        description: 'Human approval token if amount exceeds $5,000 threshold',
        required: false
      }
    ],
    execute: async (params: {
      vendorId: string;
      invoiceNumber: string;
      amount: number;
      dueDate: string;
      issueDate?: string;
      notes?: string;
      approvalToken?: string;
    }, memory: AgentMemory) => {
      // Policy check: If amount > 5000 and not approved, pause for HITL!
      if (params.amount > 5000 && !params.approvalToken && !memory.facts.approvedToken) {
        return {
          success: false,
          error: `POLICY_VIOLATION_HITL_REQUIRED: Invoice amount of $${params.amount.toFixed(2)} exceeds $5,000.00 approval threshold.`,
          requiresApproval: {
            reason: `Invoice ${params.invoiceNumber} amount ($${params.amount.toFixed(2)}) exceeds automated threshold limit of $5,000.00. Manager authorization is required before committing to the ERP ledger.`,
            severity: 'high'
          }
        };
      }

      const activeToken = params.approvalToken || memory.facts.approvedToken;

      const result = defaultErp.createPayable({
        vendorId: params.vendorId,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        dueDate: params.dueDate,
        issueDate: params.issueDate,
        notes: params.notes,
        approvalToken: activeToken
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      memory.facts.createdPayableRecordId = result.data?.id;
      return {
        success: true,
        data: result.data
      };
    }
  },
  {
    name: 'calculate_date',
    description: 'Calculates an exact ISO YYYY-MM-DD date by adding calendar days to a base date (e.g. Net 30 terms).',
    parameters: [
      {
        name: 'baseDate',
        type: 'string',
        description: 'Starting date in YYYY-MM-DD or standard parseable format',
        required: true
      },
      {
        name: 'daysToAdd',
        type: 'number',
        description: 'Number of calendar days to add (e.g. 30 for Net 30, 15 for Net 15)',
        required: true
      }
    ],
    execute: async (params: { baseDate: string; daysToAdd: number }) => {
      const date = new Date(params.baseDate);
      if (isNaN(date.getTime())) {
        return {
          success: false,
          error: `Invalid baseDate: '${params.baseDate}'. Expected valid date string.`
        };
      }
      date.setDate(date.getDate() + Number(params.daysToAdd));
      const calculatedDate = date.toISOString().split('T')[0];
      return {
        success: true,
        data: {
          baseDate: params.baseDate,
          daysAdded: params.daysToAdd,
          calculatedDate
        }
      };
    }
  },
  {
    name: 'reformat_date',
    description: 'Parses and converts human-readable or regional date strings (e.g., "October 31, 2026", "10/31/2026", "31-10-2026") into ISO YYYY-MM-DD.',
    parameters: [
      {
        name: 'dateStr',
        type: 'string',
        description: 'The raw date string to convert',
        required: true
      }
    ],
    execute: async (params: { dateStr: string }) => {
      const raw = params.dateStr.trim();
      
      // Check already ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return { success: true, data: { formattedDate: raw } };
      }

      // Check MM/DD/YYYY
      const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        const month = usMatch[1].padStart(2, '0');
        const day = usMatch[2].padStart(2, '0');
        const year = usMatch[3];
        return { success: true, data: { formattedDate: `${year}-${month}-${day}` } };
      }

      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        const formattedDate = parsed.toISOString().split('T')[0];
        return { success: true, data: { formattedDate } };
      }

      return {
        success: false,
        error: `Could not parse date string: '${params.dateStr}'. Please verify format.`
      };
    }
  },
  {
    name: 'verify_payable',
    description: 'Independently inspects the Apex ERP system to verify if a payable record was successfully committed and matches expectations.',
    parameters: [
      {
        name: 'invoiceNumber',
        type: 'string',
        description: 'Invoice number to inspect in the ERP database',
        required: true
      }
    ],
    execute: async (params: { invoiceNumber: string }) => {
      const record = defaultErp.getPayable(params.invoiceNumber);
      if (!record) {
        return {
          success: false,
          error: `Record for invoice '${params.invoiceNumber}' was NOT found in the ERP database!`
        };
      }

      return {
        success: true,
        data: {
          recordId: record.id,
          vendorId: record.vendorId,
          vendorName: record.vendorName,
          invoiceNumber: record.invoiceNumber,
          amount: record.amount,
          dueDate: record.dueDate,
          status: record.status,
          createdAt: record.createdAt,
          verified: true
        }
      };
    }
  },
  {
    name: 'notify_team',
    description: 'Dispatches a completion or update alert to a company Slack channel or notification webhook.',
    parameters: [
      {
        name: 'channel',
        type: 'string',
        description: 'Destination channel (e.g. #finance-ops, #accounts-payable)',
        required: true
      },
      {
        name: 'subject',
        type: 'string',
        description: 'Brief headline or subject of the notification',
        required: true
      },
      {
        name: 'message',
        type: 'string',
        description: 'Concise summary of the task completion and details',
        required: true
      }
    ],
    execute: async (params: { channel: string; subject: string; message: string }, memory: AgentMemory) => {
      const notif = defaultNotifications.send({
        channel: params.channel,
        recipient: 'Finance Operations Team',
        subject: params.subject,
        body: params.message,
        metadata: {
          goal: memory.goal,
          facts: memory.facts
        }
      });

      return {
        success: true,
        data: {
          notificationId: notif.id,
          channel: notif.channel,
          deliveredAt: notif.timestamp,
          summary: notif.subject
        }
      };
    }
  }
];

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    for (const tool of toolDefinitions) {
      this.tools.set(tool.name, tool);
    }
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getToolSignatures(): string {
    return this.getAllTools()
      .map(t => `- ${t.name}: ${t.description} (params: ${t.parameters.map(p => `${p.name}: ${p.type}${p.required ? '' : '?'}`).join(', ')})`)
      .join('\n');
  }
}

export const defaultToolRegistry = new ToolRegistry();
