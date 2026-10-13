import { EvidenceDossier, VerificationOutcome, AgentMemory, ReActStep, TaskStatus } from './types.ts';

export class EvidenceReporter {
  public generateDossier(params: {
    taskId: string;
    goal: string;
    status: TaskStatus;
    steps: ReActStep[];
    memory: AgentMemory;
    verification: VerificationOutcome;
    timeline: Array<{ timestamp: string; stage: string; message: string }>;
  }): EvidenceDossier {
    const { taskId, goal, status, steps, memory, verification, timeline } = params;

    const vendor = memory.facts.extractedVendor || memory.facts.canonicalVendorName || 'Unknown Vendor';
    const invoiceNum = memory.facts.extractedInvoiceNumber || 'N/A';
    const amount = memory.facts.extractedAmount ? `$${Number(memory.facts.extractedAmount).toFixed(2)}` : 'N/A';
    const dueDate = memory.facts.extractedDueDate || memory.facts.calculatedDueDate || 'N/A';
    const recordId = memory.facts.createdPayableRecordId || 'N/A';

    const summary = status === 'completed'
      ? `Successfully completed task. Discovered invoice '${invoiceNum}' from ${vendor}, extracted payable amount of ${amount} (due ${dueDate}), registered record ${recordId} in Apex Financial ERP, and verified ledger integrity.`
      : `Task ended with status '${status}'. Review step trace and verification assertions for details.`;

    const totalRetries = Object.values(memory.retries).reduce((sum, n) => sum + n, 0);
    const humanApprovalsCount = memory.facts.approvedToken ? 1 : 0;

    const rawAuditString = `${taskId}:${goal}:${status}:${steps.length}:${verification.verificationSignature}`;
    let auditHashNum = 0;
    for (let i = 0; i < rawAuditString.length; i++) {
      auditHashNum = ((auditHashNum << 5) - auditHashNum) + rawAuditString.charCodeAt(i);
      auditHashNum = auditHashNum & auditHashNum;
    }
    const auditHash = `AUDIT-0x${Math.abs(auditHashNum).toString(16).toUpperCase().padStart(8, '0')}`;

    return {
      taskId,
      goal,
      status,
      summary,
      extractedEntities: {
        vendorName: vendor,
        canonicalVendorId: memory.facts.canonicalVendorId,
        invoiceNumber: invoiceNum,
        amount: memory.facts.extractedAmount,
        currency: memory.facts.extractedCurrency || 'USD',
        dueDate: dueDate,
        issueDate: memory.facts.extractedIssueDate,
        taxId: memory.facts.extractedTaxId,
        erpRecordId: recordId,
        paymentTerms: memory.facts.extractedPaymentTerms
      },
      verification,
      auditReceipt: {
        timestamp: new Date().toISOString(),
        targetSystem: 'Apex Financial ERP v3.4',
        targetRecordId: recordId,
        totalSteps: steps.length,
        retriesCount: totalRetries,
        humanApprovalsCount,
        auditHash
      },
      timeline
    };
  }
}

export const defaultReporter = new EvidenceReporter();
