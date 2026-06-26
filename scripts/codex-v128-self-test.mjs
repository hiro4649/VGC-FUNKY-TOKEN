#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.8

import fs from 'node:fs';
import { writeJsonReport, exitFor } from './codex-v080-lib.mjs';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true };
  } catch {
    return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true };
  }
}

const agents = fs.readFileSync('AGENTS.md', 'utf8');
const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');

const cases = [
  ['v128_self_test_must_pass', () => true],
  ['agents_marker_supports_v128_compatibility', () => agents.includes('CODEX_QUALITY_HARNESS_FILE v1.3.0')
    && agents.includes('v1.2.8 remains available as readonly')],
  ['manifest_exposes_v128_compatibility_tuple', () => manifest.activeHarnessVersion === '1.3.0'
    && manifest.activeSelfTestSuite === 'v130'
    && manifest.versioningRollback?.activeHarnessVersion === '1.2.8'
    && manifest.versioningRollback?.activeSelfTestSuite === 'v128'
    && manifest.versioningRollback?.activeSelfTestStatusKey === 'v128SelfTestStatus'
    && manifest.versionAuthority?.v128 === 'blocking_compatibility'],
  ['restricted_token_target_preserved', () => manifest.targetRepoMode === true
    && manifest.targetRepoType === 'token_only_managed'
    && manifest.readonlyHarnessProfile === true
    && manifest.sourceOnlyRelease === false],
  ['restricted_materialization_is_metadata_only', () => manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.rolloutClass === 'restricted_token'
    && manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.materialization === 'metadata_only_readonly'
    && manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.sourceFullBundleCopied === false
    && manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.localFullQualityGateAdded === false],
  ['v127_rollback_tuple_available', () => manifest.versioning?.activeHarnessVersion === '1.2.7'
    && manifest.versioning?.activeSelfTestSuite === 'v127'
    && manifest.versioning?.rollbackAvailable === true
    && ['token_metadata_rollback_compatibility', 'blocking_compatibility', 'compatibility_readable'].includes(manifest.legacySelfTests?.v127)],
  ['forbidden_capabilities_remain_forbidden', () => manifest.deployForbidden === true
    && manifest.fundedTransactionForbidden === true
    && manifest.governanceTransactionForbidden === true
    && manifest.bscScanVerificationForbidden === true
    && manifest.walletAccessForbidden === true
    && manifest.rpcAccessForbidden === true
    && manifest.secretAccessForbidden === true
    && manifest.readinessClaimAllowed === false],
  ['token_economy_budget_is_restricted', () => manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.routineColdArtifactRead === 0
    && manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.routineSelectedSkillMax === 1
    && manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.routineReviewerFanout === 0
    && manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.routineOwnerInterruptMax === 0],
  ['policy_index_points_to_v130_with_v128_compatibility_and_v127_deferred', () => policy.schemaVersion === '1.3.0'
    && policy.requiredReads.includes('docs/process/CODEX_V130_SPEC.md')
    && policy.deferredReads.includes('docs/process/CODEX_V129_SPEC.md')
    && policy.deferredReads.includes('docs/process/CODEX_V128_SPEC.md')
    && policy.deferredReads.includes('docs/process/CODEX_V127_SPEC.md')
    && policy.selectedSkillsMax === 0],
  ['pr_body_is_not_machine_evidence', () => manifest.prBodyMachineEvidence === false
    && manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure?.prBodyMachineEvidence === false],
  ['active_spec_exists', () => fs.existsSync('docs/process/CODEX_V128_SPEC.md')],
].map(([name, fn]) => test(name, fn));

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v128SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: cases.length,
    failureCount: failures.length,
    safeSummaryOnly: true,
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true,
};

writeJsonReport(report, 'CODEX_V128_SELF_TEST_REPORT');
if (!process.env.CODEX_V128_SELF_TEST_REPORT && process.env.CODEX_QUALITY_REPORT !== 'json') {
  console.log(`v128SelfTestStatus: ${report.v128SelfTestStatus.status}`);
}
exitFor(report);
