export type WorkflowBudget = {
  estimatedSeconds?: number;
  estimatedIterations?: number;
  estimatedCostCents?: number;
  requiresBrowser?: boolean;
  requiresPersistentSession?: boolean;
};

export const WORKFLOW_LIMITS = {
  vercelSoftSeconds: 150,
  vercelHardGuardSeconds: 165,
  maxInlineIterations: 3,
  maxInlineCostCents: 10
} as const;

export function shouldUseDurableWorker(budget: WorkflowBudget) {
  if (budget.requiresBrowser || budget.requiresPersistentSession) return true;
  if ((budget.estimatedSeconds || 0) >= WORKFLOW_LIMITS.vercelSoftSeconds) return true;
  if ((budget.estimatedIterations || 0) > WORKFLOW_LIMITS.maxInlineIterations) return true;
  if ((budget.estimatedCostCents || 0) > WORKFLOW_LIMITS.maxInlineCostCents) return true;
  return false;
}

export function createRuntimeGuard(startedAt = Date.now()) {
  return {
    elapsedSeconds: () => Math.floor((Date.now() - startedAt) / 1000),
    mustCheckpoint: () => Date.now() - startedAt >= WORKFLOW_LIMITS.vercelSoftSeconds * 1000,
    hardGuardReached: () => Date.now() - startedAt >= WORKFLOW_LIMITS.vercelHardGuardSeconds * 1000
  };
}
