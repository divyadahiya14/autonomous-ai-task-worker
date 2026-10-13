import { VerificationOutcome, VerificationAssertion, AgentMemory } from './types.ts';
import { defaultErp } from '../env/erp.ts';
import { defaultNotifications } from '../env/notifications.ts';

export class OutcomeVerifier {
  public verify(memory: AgentMemory): VerificationOutcome {
    const assertions: VerificationAssertion[] = [];
    const invoiceNumber = memory.facts.extractedInvoiceNumber;
    const expectedAmount = memory.facts.extractedAmount;
    const expectedDueDate = memory.facts.extractedDueDate || memory.facts.calculatedDueDate;
    const expectedVendorId = memory.facts.canonicalVendorId;

    let targetRecord: any = null;

    // Assertion 1: Invoice number was discovered
    assertions.push({
      description: 'Invoice identifier extracted from source document',
      expected: 'Non-empty invoice number',
      actual: invoiceNumber || 'Missing',
      passed: Boolean(invoiceNumber)
    });

    // Assertion 2: ERP Record created in Accounts Payable
    if (invoiceNumber) {
      targetRecord = defaultErp.getPayable(invoiceNumber);
    }
    assertions.push({
      description: 'Accounts Payable record registered in Apex ERP ledger',
      expected: `Record for invoice ${invoiceNumber}`,
      actual: targetRecord ? `Record ID ${targetRecord.id} (Status: ${targetRecord.status})` : 'Record not found in ERP',
      passed: Boolean(targetRecord)
    });

    // Assertion 3: Vendor matching
    if (targetRecord) {
      assertions.push({
        description: 'Vendor ID correctly mapped to canonical entity',
        expected: expectedVendorId,
        actual: targetRecord.vendorId,
        passed: targetRecord.vendorId === expectedVendorId
      });

      // Assertion 4: Amount matching
      const amountMatches = Math.abs(targetRecord.amount - expectedAmount) < 0.01;
      assertions.push({
        description: 'Ledger payable amount matches extracted invoice amount',
        expected: expectedAmount,
        actual: targetRecord.amount,
        passed: amountMatches
      });

      // Assertion 5: Due date matching
      assertions.push({
        description: 'Payment due date correctly recorded in ISO format',
        expected: expectedDueDate,
        actual: targetRecord.dueDate,
        passed: targetRecord.dueDate === expectedDueDate
      });
    }

    // Assertion 6: Notification sent
    const latestNotif = defaultNotifications.getLatestMessage();
    assertions.push({
      description: 'Completion notification dispatched to communication channel',
      expected: 'Notification sent',
      actual: latestNotif ? `Sent to ${latestNotif.channel} at ${latestNotif.timestamp}` : 'No notification found',
      passed: Boolean(latestNotif)
    });

    const passedCount = assertions.filter(a => a.passed).length;
    const totalCount = assertions.length;
    const score = Math.round((passedCount / totalCount) * 100);
    const verified = passedCount === totalCount;

    // Generate cryptographic-style proof signature
    const signaturePayload = `${memory.goal}:${invoiceNumber}:${expectedAmount}:${Date.now()}`;
    const simpleHash = this.generateHash(signaturePayload);

    return {
      verified,
      score,
      assertions,
      verificationSignature: `VERIFY-SIG-${simpleHash.toUpperCase()}`,
      verifiedAt: new Date().toISOString(),
      recordSnapshot: targetRecord
    };
  }

  private generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export const defaultVerifier = new OutcomeVerifier();
