#!/usr/bin/env node
import fs from 'node:fs';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

const failures = [];
function check(condition, code) {
  if (!condition) failures.push(code);
}

const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');
const spec = fs.readFileSync('docs/process/CODEX_V129_SPEC.md', 'utf8');
const agents = fs.readFileSync('AGENTS.md', 'utf8');
const router = manifest.goalContractedCapabilityRouter || {};

check(manifest.marker === 'CODEX_QUALITY_HARNESS_FILE v1.2.9', 'manifest_marker');
check(policy.marker === 'CODEX_QUALITY_HARNESS_FILE v1.2.9', 'policy_marker');
check(agents.includes('CODEX_QUALITY_HARNESS_FILE v1.2.9'), 'agents_marker');
check(spec.includes('CODEX_QUALITY_HARNESS_FILE v1.2.9'), 'spec_marker');
check(manifest.activeHarnessVersion === '1.2.9', 'active_version');
check(manifest.targetHarnessVersion === '1.2.9', 'target_version');
check(manifest.activeSelfTestSuite === 'v129', 'active_suite');
check(manifest.activeSelfTestStatusKey === 'v129SelfTestStatus', 'active_status_key');
check(manifest.targetRollout === 'completed', 'target_rollout');
check(manifest.rolloutClass === 'restricted_token', 'rollout_class');
check(manifest.materialization === 'metadata_only_readonly', 'materialization');
check(manifest.legacySelfTests?.v129 === 'blocking_current', 'v129_current');
check(manifest.legacySelfTests?.v128 === 'blocking_compatibility_rollback', 'v128_rollback');
check(manifest.legacySelfTests?.v127 === 'blocking_compatibility', 'v127_compat');
check(manifest.versioningRollback?.activeHarnessVersion === '1.2.8', 'rollback_version');
check(manifest.versioningRollback?.activeSelfTestSuite === 'v128', 'rollback_suite');
check(manifest.versioningRollback?.rollbackAvailable === true, 'rollback_available');
check(router.version === '1.2.9', 'router_version');
check(router.sourceHarnessCommit === '07bba3cba7456375194fc25fe1d2108a893502d0', 'source_commit');
check(router.rolloutClass === 'restricted_token', 'router_rollout_class');
check(router.materialization === 'metadata_only_readonly', 'router_materialization');
check(router.sourceFullBundleCopied === false, 'source_bundle');
check(router.modelIdPinnedInTarget === false, 'model_pin');
check(router.hostAdapterStoredInTarget === false, 'host_adapter');
check(router.realHostExecution === 'user_local_trusted_adapter', 'real_host');
check(router.independentVerifierRequired === true, 'verifier_required');
check(router.pluginDefault === 'none', 'plugin_default');
check(router.pluginUnavailablePolicy === 'explicit_nonblocking', 'plugin_policy');
check(router.finalAuthority === 'v1.1.8_final_decision_kernel', 'final_authority');
check(router.routineColdArtifactRead === 0, 'cold_reads');
check(router.routineSelectedSkillMax === 1, 'skill_max');
check(router.routineReviewerFanout === 0, 'reviewer_fanout');
check(router.routineOwnerInterruptMax === 0, 'owner_interrupt');
check(router.productCodeChanged === false, 'product_code');
check(router.runtimeCodeChanged === false, 'runtime_code');
check(router.packageOrLockfileChanged === false, 'package_lock');
check(router.workflowChanged === false, 'workflow');
check(router.authorityCreated === false, 'authority');
check(policy.requiredReads.includes('docs/process/CODEX_V129_SPEC.md'), 'policy_v129_read');
check(policy.deferredReads.includes('docs/process/CODEX_V128_SPEC.md'), 'policy_v128_deferred');
check(policy.deferredReads.includes('docs/process/CODEX_V127_SPEC.md'), 'policy_v127_deferred');
check(policy.selectedSkillsMax === 1, 'policy_skill_max');
check(policy.routineColdArtifactReadMax === 0, 'policy_cold_reads');
check(policy.rawLogsForbidden === true, 'raw_logs');
check(policy.fullHistoryForbidden === true, 'full_history');
check(router.targetProtections?.deployForbidden === true, 'deploy_forbidden');
check(router.targetProtections?.valueTransferForbidden === true, 'value_transfer_forbidden');
check(router.targetProtections?.rpcAccessForbidden === true, 'rpc_forbidden');
check(router.targetProtections?.secretAccessForbidden === true, 'secret_forbidden');
check(router.targetProtections?.readinessClaimAllowed === false, 'readiness_forbidden');
check(manifest.materialization === 'metadata_only_readonly', 'restricted_materialization');


const report = {
  v129SelfTestStatus: failures.length === 0 ? 'pass' : 'fail',
  status: failures.length === 0 ? 'pass' : 'fail',
  blockingCount: failures.length,
  reasonCodes: failures,
  activeHarnessVersion: manifest.activeHarnessVersion,
  activeSelfTestSuite: manifest.activeSelfTestSuite,
  targetRollout: manifest.targetRollout,
  rolloutClass: manifest.rolloutClass,
  materialization: manifest.materialization,
  finalAuthority: router.finalAuthority,
  authorityCreated: router.authorityCreated
};
if (process.env.CODEX_QUALITY_REPORT === 'json') {
  console.log(JSON.stringify(report));
} else if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
} else {
  console.log('v129 target self-test: pass');
}
process.exit(failures.length === 0 ? 0 : 1);
