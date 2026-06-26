#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.3.0

export const currentVersion = '1.3.0';
export const previousVersion = '1.2.9';
export const activeSelfTestStatusKey = 'v130SelfTestStatus';
export const activeSelfTestSuite = 'v130';
export const legacyAdvisorySuites = ['v129', 'v128', 'v127', 'v126', 'v125', 'v124', 'v123', 'v122', 'v121', 'v120', 'v119', 'v118', 'v117', 'v116', 'v115', 'v114', 'v113'];
export const knownVersions = ['1.0.3', '1.0.4', '1.0.5', '1.0.6', '1.0.7', '1.0.8', '1.0.9', '1.1.0', '1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.1.5', '1.1.6', '1.1.7', '1.1.8', '1.1.9', '1.2.0', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.2.6', '1.2.7', '1.2.8', '1.2.9', '1.3.0'];
export const versionLineagePolicy = {
  sourceOnlyRelease: false,
  targetRollout: 'completed',
  rolloutClass: 'restricted_token',
  materialization: 'metadata_only_readonly',
  v129RollbackAvailable: true,
  v128CompatibilityAvailable: true,
  v127ReadableCompatibilityAvailable: true,
  representativeLivePrValidation: 'not_started',
  representativeRealPrReplay: 'required',
  decisionLedger: 'required',
  evidenceConvergence: 'required',
  tokenEconomy: 'required',
  operationalClosure: 'required',
  tokenHardCap: 'required',
  contextCapsule: 'required',
  failureClosure: 'required',
  conversationSurfaceMinimization: 'required',
  evidenceFidelity: 'required',
  minimalSurface: 'required',
  fastGates: 'required',
  typedDecisions: 'required',
  compatibilityProof: 'required',
  observedStateBridgeSafeLoopRuntime: 'required',
  contextSlimSkillValidationRouting: 'required',
  receiptCarriedContinuation: 'required',
  decisionEvidenceCompression: 'required',
  validationDagEvidenceReuse: 'required',
  ownerInterruptTokenBudget: 'required',
  blockerClosureProductValuePressure: 'required',
  deterministicDecisionProjection: 'required',
  tokenMinimalLoopClosure: 'required',
  goalContractedCapabilityRouting: 'immediate_rollback',
  independentVerification: 'immediate_rollback',
  v130CoreTargetProfile: 'required',
  performanceTrack: 'deferred_non_authoritative',
  FableComparatorState: 'unavailable',
  superiorityClaimState: 'not_proven',
  sourceFullBundleCopied: false,
  modelIdPinnedInTarget: false,
  hostAdapterStoredInTarget: false,
  localFullQualityGateAdded: false,
  routineColdArtifactRead: 0,
  routineSelectedSkillMax: 0,
  routineReviewerFanout: 0,
  runtimeReadinessClaimed: false,
  productionReadinessClaimed: false,
  safeSummaryOnly: true,
};

export function buildHarnessVersionRegistry() {
  return {
    currentVersion,
    previousVersion,
    activeSelfTestStatusKey,
    activeSelfTestSuite,
    legacyAdvisorySuites,
    knownVersions,
    versionLineagePolicy,
    safeSummaryOnly: true,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildHarnessVersionRegistry(), null, 2));
}
