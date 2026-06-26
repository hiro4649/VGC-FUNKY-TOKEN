#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.3.0

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
const v130 = manifest.v130CoreTargetProfile ?? {};
const performanceTrack = manifest.performanceTrack ?? {};

const cases = [
  ['v130_self_test_must_pass', () => true],
  ['agents_marker_is_v130', () => agents.includes('CODEX_QUALITY_HARNESS_FILE v1.3.0')],
  ['manifest_active_tuple_is_v130_core', () => manifest.activeHarnessVersion === '1.3.0'
    && manifest.activeSelfTestSuite === 'v130'
    && manifest.activeSelfTestStatusKey === 'v130SelfTestStatus'
    && manifest.previousVersion === '1.2.9'
    && manifest.targetHarnessVersion === '1.3.0'
    && manifest.targetRollout === 'completed'],
  ['v129_rollback_available', () => manifest.v129Rollback?.activeHarnessVersion === '1.2.9'
    && manifest.v129Rollback?.activeSelfTestSuite === 'v129'
    && manifest.v129Rollback?.rollbackAvailable === true
    && manifest.versionAuthority?.v129 === 'immediate_rollback'],
  ['v128_compatibility_available', () => manifest.versioningRollback?.activeHarnessVersion === '1.2.8'
    && manifest.versioningRollback?.activeSelfTestSuite === 'v128'
    && manifest.versionAuthority?.v128 === 'blocking_compatibility'],
  ['v127_readable_compatibility_available', () => manifest.versioning?.activeHarnessVersion === '1.2.7'
    && manifest.versioning?.activeSelfTestSuite === 'v127'
    && manifest.versionAuthority?.v127 === 'compatibility_readable'],
  ['performance_track_non_authoritative', () => performanceTrack.state === 'deferred'
    && performanceTrack.authoritative === false
    && performanceTrack.FableComparatorState === 'unavailable'
    && performanceTrack.superiorityClaimState === 'not_proven'
    && performanceTrack.sixtyTaskBenchmarkState === 'not_required_for_core_activation'
    && performanceTrack.affectsQualityScore === false
    && performanceTrack.affectsBlockingCount === false],
  ['core_does_not_install_excluded_runtime_surfaces', () => v130.installsPerformanceTrack === false
    && v130.installsFableComparator === false
    && v130.installsSdkBenchmarkRunner === false
    && v130.installsSixtyTaskBenchmark === false
    && v130.installsSkillRuntimeActivation === false
    && v130.installsDagAgentTeamRuntime === false
    && v130.installsLearnedPolicyActivation === false
    && v130.installsCyberSpecialistRuntime === false],
  ['token_budgets_remain_restricted', () => v130.routineColdArtifactRead === 0
    && v130.routineSelectedSkillMax === 0
    && v130.routineReviewerFanout === 0
    && v130.routineOwnerInterruptMax === 0
    && policy.selectedSkillsMax === 0
    && policy.routineColdArtifactReadMax === 0],
  ['target_development_resume_policy_present', () => Array.isArray(v130.targetDevelopmentResumePolicy?.allowedUnderTargetHarness)
    && v130.targetDevelopmentResumePolicy.performanceTrackBlocksProductDevelopment === false],
  ['authority_not_created_and_product_not_mutated', () => manifest.authorityCreated === false
    && manifest.targetMutationCount === 0
    && v130.authorityCreated === false
    && v130.productRuntimeMutationCount === 0],
  ['historical_specs_exist', () => fs.existsSync('docs/process/CODEX_V129_SPEC.md')
    && fs.existsSync('docs/process/CODEX_V128_SPEC.md')
    && fs.existsSync('docs/process/CODEX_V127_SPEC.md')],
].map(([name, fn]) => test(name, fn));

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v130SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: cases.length,
    failureCount: failures.length,
    performanceTrack: 'deferred_non_authoritative',
    FableComparatorState: 'unavailable',
    superiorityClaimState: 'not_proven',
    authorityCreated: false,
    targetMutationCount: 0,
    safeSummaryOnly: true,
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true,
};

writeJsonReport(report, 'CODEX_V130_SELF_TEST_REPORT');
if (!process.env.CODEX_V130_SELF_TEST_REPORT && process.env.CODEX_QUALITY_REPORT !== 'json') {
  console.log(`v130SelfTestStatus: ${report.v130SelfTestStatus.status}`);
}
exitFor(report);
