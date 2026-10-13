import readline from 'readline';
import { AutonomousAgent } from '../core/agent.ts';
import { defaultErp } from '../env/erp.ts';

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const goal = args[0] || 'Find the latest invoice from Acme Corp, extract the amount and due date, enter it into our internal system, and tell me once it is done.';

  console.log('='.repeat(70));
  console.log('🤖 AutoWorker CLI - Autonomous AI Task Worker');
  console.log('='.repeat(70));
  console.log(`📌 Goal: "${goal}"\n`);

  const agent = new AutonomousAgent();

  agent.addListener(async (event, payload) => {
    if (event === 'plan_created') {
      console.log('📋 [PLAN GENERATED]:');
      payload.plan.forEach((step: any, i: number) => {
        console.log(`   ${i + 1}. [${step.title}] - ${step.description}`);
      });
      console.log('');
    } else if (event === 'agent_thought') {
      console.log(`💭 [THOUGHT (Step ${payload.stepNumber})]:\n   ${payload.thought}\n`);
    } else if (event === 'tool_executing') {
      console.log(`⚡ [ACTION]: ${payload.tool}(${JSON.stringify(payload.params)})`);
    } else if (event === 'step_completed') {
      const step = payload;
      if (step.observation.success) {
        console.log(`✅ [OBSERVATION]: Success`);
        if (step.observation.data) {
          const summaryStr = JSON.stringify(step.observation.data).slice(0, 140);
          console.log(`   Data: ${summaryStr}...`);
        }
      } else {
        console.log(`❌ [OBSERVATION FAILED]: ${step.observation.error}`);
        console.log(`   🔄 Triggering self-correction / error recovery...`);
      }
      console.log('-'.repeat(50));
    } else if (event === 'hitl_requested') {
      console.log('\n' + '!'.repeat(70));
      console.log('⚠️ [HUMAN-IN-THE-LOOP APPROVAL REQUIRED]');
      console.log(`Reason: ${payload.reason}`);
      console.log(`Proposed Action: ${payload.proposedAction.tool}(${JSON.stringify(payload.proposedAction.params)})`);
      console.log('!'.repeat(70) + '\n');

      const answer = await promptUser('👉 Approve this action? (y/n): ');
      const approved = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';

      await agent.resumeWithHitlDecision({
        requestId: payload.requestId,
        approved,
        userInput: approved ? 'Manager terminal approval granted' : 'Declined by operator'
      });
    }
  });

  const dossier = await agent.runTask(goal);

  console.log('\n' + '='.repeat(70));
  console.log('🎯 [TASK EXECUTION DOSSIER & VERIFICATION]');
  console.log('='.repeat(70));
  console.log(`Status:       ${dossier.status.toUpperCase()}`);
  console.log(`Summary:      ${dossier.summary}`);
  console.log(`Target Rec:   ${dossier.auditReceipt.targetRecordId}`);
  console.log(`Verification: Score ${dossier.verification.score}% (${dossier.verification.verified ? 'PASSED' : 'FAILED'})`);
  console.log(`Proof Hash:   ${dossier.verification.verificationSignature}`);
  console.log(`Audit Hash:   ${dossier.auditReceipt.auditHash}`);
  console.log('\nVerified Assertions:');
  dossier.verification.assertions.forEach((a, i) => {
    console.log(`  ${a.passed ? '✓' : '✗'} ${i + 1}. ${a.description}: ${a.actual}`);
  });
  console.log('='.repeat(70) + '\n');
}

main().catch(err => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
