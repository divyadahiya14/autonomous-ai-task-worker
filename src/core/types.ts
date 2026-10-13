export type TaskStatus = 
  | 'idle' 
  | 'planning' 
  | 'running' 
  | 'waiting_approval' 
  | 'verifying' 
  | 'completed' 
  | 'failed';

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  toolsNeeded: string[];
  resultSummary?: string;
}

export interface ReActStep {
  stepNumber: number;
  subGoalId?: string;
  thought: string;
  action: {
    tool: string;
    params: Record<string, any>;
  };
  observation: {
    success: boolean;
    data?: any;
    error?: string;
  };
  timestamp: string;
}

export interface HitlRequest {
  requestId: string;
  taskId: string;
  type: 'approval' | 'clarification';
  reason: string;
  severity: 'low' | 'medium' | 'high';
  proposedAction: {
    tool: string;
    params: Record<string, any>;
  };
  options?: string[];
  resolved: boolean;
  userDecision?: {
    approved: boolean;
    userInput?: string;
    timestamp: string;
  };
}

export interface VerificationAssertion {
  description: string;
  expected: any;
  actual: any;
  passed: boolean;
}

export interface VerificationOutcome {
  verified: boolean;
  score: number; // 0 to 100
  assertions: VerificationAssertion[];
  verificationSignature: string;
  verifiedAt: string;
  recordSnapshot?: any;
}

export interface EvidenceDossier {
  taskId: string;
  goal: string;
  status: TaskStatus;
  summary: string;
  extractedEntities: Record<string, any>;
  verification: VerificationOutcome;
  auditReceipt: {
    timestamp: string;
    targetSystem: string;
    targetRecordId?: string;
    totalSteps: number;
    retriesCount: number;
    humanApprovalsCount: number;
    auditHash: string;
  };
  timeline: Array<{
    timestamp: string;
    stage: string;
    message: string;
  }>;
}

export interface AgentMemory {
  goal: string;
  facts: Record<string, any>;
  retries: Record<string, number>;
  activeStepIndex: number;
  errorHistory: string[];
  pendingHitl?: HitlRequest;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    description: string;
    required: boolean;
  }[];
  execute: (params: any, memory: AgentMemory) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
    requiresApproval?: {
      reason: string;
      severity: 'low' | 'medium' | 'high';
    };
  }>;
}
