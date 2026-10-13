import { AgentMemory, HitlRequest } from './types.ts';

export class MemoryStore {
  private memory: AgentMemory;

  constructor(goal: string) {
    this.memory = {
      goal,
      facts: {},
      retries: {},
      activeStepIndex: 0,
      errorHistory: [],
    };
  }

  public getMemory(): AgentMemory {
    return this.memory;
  }

  public setFact(key: string, value: any) {
    this.memory.facts[key] = value;
  }

  public getFact<T = any>(key: string): T | undefined {
    return this.memory.facts[key];
  }

  public recordRetry(key: string): number {
    const current = (this.memory.retries[key] || 0) + 1;
    this.memory.retries[key] = current;
    return current;
  }

  public getRetryCount(key: string): number {
    return this.memory.retries[key] || 0;
  }

  public logError(error: string) {
    this.memory.errorHistory.push(error);
  }

  public setPendingHitl(hitl: HitlRequest) {
    this.memory.pendingHitl = hitl;
  }

  public clearPendingHitl() {
    this.memory.pendingHitl = undefined;
  }

  public reset(goal?: string) {
    this.memory = {
      goal: goal || this.memory.goal,
      facts: {},
      retries: {},
      activeStepIndex: 0,
      errorHistory: [],
    };
  }
}
