export interface InvoiceDocument {
  id: string;
  filename: string;
  vendorName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string; // May be missing in some docs to test self-correction
  paymentTerms?: string;
  amount: number;
  currency: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  taxId: string;
  notes: string;
  rawText: string;
}

export class DocumentInbox {
  private documents: InvoiceDocument[] = [
    {
      id: 'doc-001',
      filename: 'invoice_acme_corp_oct2026.txt',
      vendorName: 'Acme Corporation',
      invoiceNumber: 'INV-ACME-2026-09',
      issueDate: '2026-10-01',
      dueDate: '2026-10-31',
      paymentTerms: 'Net 30',
      amount: 4250.00,
      currency: 'USD',
      items: [
        { description: 'Enterprise Cloud Seats (5 licenses)', quantity: 5, unitPrice: 700.00, total: 3500.00 },
        { description: 'Priority SLA Support - Q4', quantity: 1, unitPrice: 750.00, total: 750.00 }
      ],
      taxId: 'US-9912048',
      notes: 'Please remit payment via ACH to Acme Corp Treasury.',
      rawText: `=====================================================
INVOICE: Acme Corporation
Invoice #: INV-ACME-2026-09
Issue Date: October 01, 2026
Due Date: October 31, 2026
Payment Terms: Net 30
Vendor Tax ID: US-9912048
Billed To: Apex Enterprises Inc.

LINE ITEMS:
1. Enterprise Cloud Seats (5 licenses) @ $700.00 = $3,500.00
2. Priority SLA Support - Q4 @ $750.00 = $750.00

SUBTOTAL: $4,250.00
TAX (0%): $0.00
TOTAL AMOUNT DUE: $4,250.00 USD

Remit Payment To:
Bank: Silicon Valley Commercial Bank
Account: ****-****-9821
Routing: 121000358
=====================================================`
    },
    {
      id: 'doc-002',
      filename: 'invoice_globex_cloud_nov2026.txt',
      vendorName: 'Globex Corporation',
      invoiceNumber: 'INV-GLOBEX-4821',
      issueDate: '2026-10-15',
      dueDate: '2026-11-15',
      paymentTerms: 'Net 30',
      amount: 1890.50,
      currency: 'USD',
      items: [
        { description: 'IT Infrastructure Managed Hosting', quantity: 1, unitPrice: 1890.50, total: 1890.50 }
      ],
      taxId: 'US-8823194',
      notes: 'Monthly server hosting invoice.',
      rawText: `=====================================================
GLOBEX CORPORATION - MONTHLY INVOICE
Invoice Reference: INV-GLOBEX-4821
Billing Date: 2026-10-15
Due Date: 2026-11-15
Vendor ID / Tax: US-8823194

Services Rendered:
- IT Infrastructure Managed Hosting: $1,890.50

Total Payable: $1,890.50 USD
Due within 30 days.
=====================================================`
    },
    {
      id: 'doc-003',
      filename: 'invoice_cyberdyne_systems_high_value.txt',
      vendorName: 'Cyberdyne Systems LLC',
      invoiceNumber: 'INV-CYBERDYNE-9901',
      issueDate: '2026-10-10',
      dueDate: '2026-10-25',
      paymentTerms: 'Net 15',
      amount: 14500.00,
      currency: 'USD',
      items: [
        { description: 'Automated Robotics Assembly Unit v4', quantity: 1, unitPrice: 14500.00, total: 14500.00 }
      ],
      taxId: 'US-7719201',
      notes: 'High-value equipment purchase. Exceeds standard auto-approval limits.',
      rawText: `=====================================================
CYBERDYNE SYSTEMS LLC - COMMERCIAL HARDWARE INVOICE
Invoice Number: INV-CYBERDYNE-9901
Date of Issue: 2026-10-10
Payment Due Date: 2026-10-25
Payment Terms: Net 15
Tax Registration: US-7719201

Product:
- 1x Automated Robotics Assembly Unit v4: $14,500.00

TOTAL DUE: $14,500.00 USD
ATTENTION: High capital asset transaction.
=====================================================`
    },
    {
      id: 'doc-004',
      filename: 'invoice_stark_industries_net30.txt',
      vendorName: 'Stark Industries Inc',
      invoiceNumber: 'INV-STARK-3012',
      issueDate: '2026-10-05',
      // Notice: dueDate is intentionally omitted in header, only stated as Net 30 days!
      paymentTerms: 'Net 30 days from invoice date',
      amount: 8750.00,
      currency: 'USD',
      items: [
        { description: 'Arc Micro-Turbine Energy Consulting', quantity: 1, unitPrice: 8750.00, total: 8750.00 }
      ],
      taxId: 'US-1120938',
      notes: 'Payment terms strictly Net 30 from invoice date (2026-10-05).',
      rawText: `=====================================================
STARK INDUSTRIES INC.
Invoice Code: INV-STARK-3012
Date of Invoice: 2026-10-05
Terms of Payment: Net 30 days from invoice date
Tax ID: US-1120938

Consulting Deliverables:
- Arc Micro-Turbine Energy Consulting: $8,750.00

Net Amount Payable: $8,750.00 USD
*No explicit due date header printed; due date is calculated as 30 days from October 05, 2026 (November 04, 2026).*
=====================================================`
    },
    {
      id: 'doc-005',
      filename: 'invoice_initech_formatted_date.txt',
      vendorName: 'Initech Consulting',
      invoiceNumber: 'INV-INITECH-1004',
      issueDate: '2026-10-12',
      dueDate: '2026-11-12',
      paymentTerms: 'Net 30',
      amount: 3200.00,
      currency: 'USD',
      items: [
        { description: 'Legacy Software Maintenance', quantity: 1, unitPrice: 3200.00, total: 3200.00 }
      ],
      taxId: 'US-5541920',
      notes: 'Date written as 11/12/2026 in text representation.',
      rawText: `=====================================================
INITECH CONSULTING
Invoice No: INV-INITECH-1004
Invoice Date: 10/12/2026
Due Date: 11/12/2026
Tax Identifier: US-5541920

Services:
- Legacy Software Maintenance: $3,200.00
Grand Total: $3,200.00 USD
=====================================================`
    }
  ];

  public listDocuments(): { filename: string; vendorName: string; size: string }[] {
    return this.documents.map(d => ({
      filename: d.filename,
      vendorName: d.vendorName,
      size: `${d.rawText.length} bytes`
    }));
  }

  public searchDocuments(query: string): InvoiceDocument[] {
    const q = query.toLowerCase().trim();
    return this.documents.filter(d => 
      d.filename.toLowerCase().includes(q) ||
      d.vendorName.toLowerCase().includes(q) ||
      d.invoiceNumber.toLowerCase().includes(q) ||
      d.rawText.toLowerCase().includes(q)
    );
  }

  public getDocumentByFilename(filename: string): InvoiceDocument | undefined {
    return this.documents.find(d => 
      d.filename.toLowerCase() === filename.toLowerCase() ||
      d.filename.toLowerCase().includes(filename.toLowerCase())
    );
  }
}

export const defaultInbox = new DocumentInbox();
