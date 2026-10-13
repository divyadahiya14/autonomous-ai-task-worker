import { 
  TaskStatus, 
  PlanStep, 
  ReActStep, 
  HitlRequest, 
  AgentMemory, 
  EvidenceDossier, 
  VerificationOutcome 
} from './types.ts';
import { ToolRegistry, defaultToolRegistry } from './tools.ts';
import { LLMEngine, defaultLLMEngine } from './llm.ts';
import { MemoryStore } from './memory.ts';
import { OutcomeVerifier, defaultVerifier } from './verifier.ts';
import { EvidenceReporter, defaultReporter } from './reporter.ts';

export type AgentEventListener = (event: string, payload: any) => void;

export class AutonomousAgent {
  private id: string;
  private goal: string = '';
  private status: TaskStatus = 'idle';
  private plan: PlanStep[] = [];
  private steps: ReActStep[] = [];
  private memoryStore: MemoryStore;
  private tools: ToolRegistry;
  private llm: LLMEngine;
  private verifier: OutcomeVerifier;
  private reporter: EvidenceReporter;
  private listeners: AgentEventListener[] = [];
  private pendingHitl?: HitlRequest;
  private timeline: Array<{ timestamp: string; stage: string; message: string }> = [];
  private maxSteps: number = 15;
  private isPaused: boolean = false;

  constructor(options?: {
    tools?: ToolRegistry;
    llm?: LLMEngine;
    verifier?: OutcomeVerifier;
    reporter?: EvidenceReporter;
  }) {
    this.id = `TASK-${Date.now()}`;
    this.memoryStore = new MemoryStore('');
    this.tools = options?.tools || defaultToolRegistry;
    this.llm = options?.llm || defaultLLMEngine;
    this.verifier = options?.verifier || defaultVerifier;
    this.reporter = options?.reporter || defaultReporter;
  }

  public addListener(listener: AgentEventListener) {
    this.listeners.push(listener);
  }

  public removeListener(listener: AgentEventListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private emit(event: string, payload: any) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (e) {
        console.error('Error in agent event listener:', e);
      }
    }
  }

  private addTimelineEntry(stage: string, message: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      stage,
      message
    };
    this.timeline.push(entry);
    this.emit('timeline_entry', entry);
  }

  public getStatus(): TaskStatus {
    return this.status;
  }

  public getPlan(): PlanStep[] {
    return [...this.plan];
  }

  public getSteps(): ReActStep[] {
    return [...this.steps];
  }

  public getMemory(): AgentMemory {
    return this.memoryStore.getMemory();
  }

  public getPendingHitl(): HitlRequest | undefined {
    return this.pendingHitl;
  }

  /**
   * Start executing a natural language goal
   */
  public async runTask(goal: string): Promise<EvidenceDossier> {
    this.id = `TASK-${Date.now()}`;
    this.goal = goal;
    this.status = 'planning';
    this.steps = [];
    this.timeline = [];
    this.memoryStore.reset(goal);
    this.pendingHitl = undefined;
    this.isPaused = false;

    this.addTimelineEntry('INIT', `Received task goal: "${goal}"`);
    this.emit('task_started', { taskId: this.id, goal });

    // Step 1: Goal Understanding & Decomposition
    this.addTimelineEntry('PLANNING', 'Analyzing user goal and decomposing into sequential sub-tasks...');
    const planOutput = await this.llm.planGoal(goal);
    this.plan = planOutput.subGoals;
    this.addTimelineEntry('PLAN_READY', `Generated adaptive plan with ${this.plan.length} sub-goals.`);
    this.emit('plan_created', { plan: this.plan, strategy: planOutput.overallStrategy });

    // Step 2: Autonomous ReAct Execution Loop
    this.status = 'running';
    let stepCount = 0;

    while (stepCount < this.maxSteps && (this.status as TaskStatus) === 'running') {
      stepCount++;
      const nextStepResult = await this.executeNextAction(stepCount);

      if ((this.status as TaskStatus) === 'waiting_approval') {
        // Paused for Human-In-The-Loop. Return promise that will resume once resolved.
        const hitl = this.pendingHitl as HitlRequest | undefined;
        this.addTimelineEntry('HITL_PAUSE', `Execution paused. Awaiting human confirmation for: ${hitl?.reason || 'Authorization Required'}`);
        break;
      }

      if (nextStepResult.isGoalReached) {
        break;
      }

      // Small throttle for realistic perception / UI streaming
      await new Promise(res => setTimeout(res, 400));
    }

    if ((this.status as TaskStatus) === 'waiting_approval') {
      // Return partial dossier indicating pending approval
      return this.generateDossier();
    }

    // Step 3: Verification Phase
    return await this.finalizeAndVerify();
  }

  /**
   * Executes a single ReAct cycle
   */
  private async executeNextAction(stepNumber: number): Promise<{ isGoalReached?: boolean }> {
    // 1. Reason: Decide Next Action
    const decision = await this.llm.decideNextAction({
      goal: this.goal,
      plan: this.plan,
      history: this.steps,
      memory: this.memoryStore.getMemory()
    });

    if (decision.isGoalReached) {
      this.addTimelineEntry('GOAL_REACHED', 'All actions satisfied. Entering verification phase.');
      return { isGoalReached: true };
    }

    const { thought, action } = decision;

    // Update active sub-goal status
    this.updatePlanStatusForAction(action.tool);

    this.addTimelineEntry('THOUGHT', thought);
    this.emit('agent_thought', { stepNumber, thought });

    // 2. Check if the tool exists
    const tool = this.tools.getTool(action.tool);
    if (!tool) {
      const err = `Tool '${action.tool}' not found in registry.`;
      this.steps.push({
        stepNumber,
        thought,
        action,
        observation: { success: false, error: err },
        timestamp: new Date().toISOString()
      });
      this.memoryStore.logError(err);
      this.emit('step_completed', this.steps[this.steps.length - 1]);
      return { isGoalReached: false };
    }

    this.addTimelineEntry('ACTION', `Invoking tool '${action.tool}' with parameters: ${JSON.stringify(action.params)}`);
    this.emit('tool_executing', { stepNumber, tool: action.tool, params: action.params });

    // 3. Act: Execute Tool
    const result = await tool.execute(action.params, this.memoryStore.getMemory());

    // 4. Check for Human-In-The-Loop Trigger
    if (result.requiresApproval) {
      const hitlRequest: HitlRequest = {
        requestId: `HITL-${Date.now()}`,
        taskId: this.id,
        type: 'approval',
        reason: result.requiresApproval.reason,
        severity: result.requiresApproval.severity,
        proposedAction: action,
        resolved: false
      };
      this.pendingHitl = hitlRequest;
      this.memoryStore.setPendingHitl(hitlRequest);
      this.status = 'waiting_approval';
      this.emit('hitl_requested', hitlRequest);
      return { isGoalReached: false };
    }

    // 5. Observe & Record Result
    const reactStep: ReActStep = {
      stepNumber,
      thought,
      action,
      observation: {
        success: result.success,
        data: result.data,
        error: result.error
      },
      timestamp: new Date().toISOString()
    };

    this.steps.push(reactStep);

    if (result.success) {
      this.addTimelineEntry('OBSERVATION', `Tool '${action.tool}' succeeded.`);
    } else {
      this.addTimelineEntry('FAILURE_DETECTED', `Tool '${action.tool}' failed: ${result.error}`);
      this.memoryStore.logError(result.error || 'Unknown error');
      this.memoryStore.recordRetry(action.tool);
    }

    this.emit('step_completed', reactStep);
    return { isGoalReached: false };
  }

  /**
   * Resumes execution after a user approves or rejects an action
   */
  public async resumeWithHitlDecision(params: {
    requestId: string;
    approved: boolean;
    userInput?: string;
  }): Promise<EvidenceDossier> {
    if (this.status !== 'waiting_approval' || !this.pendingHitl) {
      throw new Error('Agent is not currently waiting for approval.');
    }

    this.pendingHitl.resolved = true;
    this.pendingHitl.userDecision = {
      approved: params.approved,
      userInput: params.userInput,
      timestamp: new Date().toISOString()
    };

    this.addTimelineEntry(
      'HITL_DECISION',
      params.approved 
        ? `Human Manager APPROVED the pending action. Resuming execution.`
        : `Human Manager REJECTED the pending action. Reason/Note: ${params.userInput || 'None'}`
    );

    this.emit('hitl_resolved', this.pendingHitl);

    if (params.approved) {
      // Grant approval token in memory
      this.memoryStore.setFact('approvedToken', `AUTH-MGR-${Date.now().toString(36).toUpperCase()}`);
      this.status = 'running';
      this.pendingHitl = undefined;
      this.memoryStore.clearPendingHitl();

      // Continue execution loop
      let stepCount = this.steps.length;
      while (stepCount < this.maxSteps && (this.status as TaskStatus) === 'running') {
        stepCount++;
        const nextStepResult = await this.executeNextAction(stepCount);
        if ((this.status as TaskStatus) === 'waiting_approval') break;
        if (nextStepResult.isGoalReached) break;
        await new Promise(res => setTimeout(res, 400));
      }

      if ((this.status as TaskStatus) === 'waiting_approval') {
        return this.generateDossier();
      }

      return await this.finalizeAndVerify();
    } else {
      // User rejected
      this.status = 'failed';
      this.pendingHitl = undefined;
      this.memoryStore.clearPendingHitl();
      this.addTimelineEntry('TERMINATED', 'Task terminated due to human disapproval.');
      return this.generateDossier();
    }
  }

  /**
   * Verification & Dossier Generation
   */
  private async finalizeAndVerify(): Promise<EvidenceDossier> {
    this.status = 'verifying';
    this.addTimelineEntry('VERIFYING', 'Running independent post-execution state verification...');

    const verification = this.verifier.verify(this.memoryStore.getMemory());

    if (verification.verified) {
      this.status = 'completed';
      // Mark all plan steps as completed
      this.plan = this.plan.map(p => ({ ...p, status: 'completed' }));
      this.addTimelineEntry('VERIFIED_SUCCESS', `Verification PASSED (100% score). Proof Hash: ${verification.verificationSignature}`);
    } else {
      this.status = 'failed';
      this.addTimelineEntry('VERIFY_DISCREPANCY', `Verification FAILED. One or more assertions did not pass.`);
    }

    const dossier = this.generateDossier(verification);
    this.emit('task_finished', dossier);
    return dossier;
  }

  public generateDossier(explicitVerification?: VerificationOutcome): EvidenceDossier {
    const verification = explicitVerification || this.verifier.verify(this.memoryStore.getMemory());
    return this.reporter.generateDossier({
      taskId: this.id,
      goal: this.goal,
      status: this.status,
      steps: this.steps,
      memory: this.memoryStore.getMemory(),
      verification,
      timeline: this.timeline
    });
  }

  private updatePlanStatusForAction(toolName: string) {
    if (toolName === 'search_inbox' || toolName === 'read_document') {
      if (this.plan[0]) this.plan[0].status = 'in_progress';
    } else if (toolName === 'lookup_vendor' || toolName === 'calculate_date' || toolName === 'reformat_date') {
      if (this.plan[0]) this.plan[0].status = 'completed';
      if (this.plan[1]) this.plan[1].status = 'in_progress';
    } else if (toolName === 'enter_payable') {
      if (this.plan[1]) this.plan[1].status = 'completed';
      if (this.plan[2]) this.plan[2].status = 'in_progress';
    } else if (toolName === 'verify_payable' || toolName === 'notify_team') {
      if (this.plan[2]) this.plan[2].status = 'completed';
      if (this.plan[3]) this.plan[3].status = 'in_progress';
    }
  }
}
