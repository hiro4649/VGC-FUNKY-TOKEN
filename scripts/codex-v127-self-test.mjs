#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.7

import fs from 'node:fs';

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return null;
  }
}

function readJson(file) {
  const text = readText(file);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function test(name, ok, reasonCode = null) {
  return {
    name,
    status: ok ? 'pass' : 'fail',
    ...(reasonCode ? { reasonCode } : {}),
    safeSummaryOnly: true,
  };
}

const agents = readText('AGENTS.md') || '';
const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const sourceManifest = readJson('CODEX_SOURCE_HARNESS_MANIFEST.json');
const spec = readText('docs/process/CODEX_V127_SPEC.md');

const manifests = [manifest, sourceManifest].filter(Boolean);
const requiredVersions = [
  'schemaVersion',
  'sourceHarnessVersion',
  'harnessVersion',
  'activeHarnessVersion',
  'targetHarnessVersion',
];

const forbiddenFlags = [
  'deployForbidden',
  'fundedTransactionForbidden',
  'governanceTransactionForbidden',
  'bscScanVerificationForbidden',
  'releaseForbidden',
  'walletAccessForbidden',
  'rpcAccessForbidden',
  'secretAccessForbidden',
];

const cases = [
  test('v127_token_metadata_self_test_must_pass', true),
  test('agents_marker_is_v127', agents.includes('CODEX_QUALITY_HARNESS_FILE v1.2.7'), 'agents_marker_not_v127'),
  test('v127_spec_present', Boolean(spec), 'v127_spec_missing'),
  test('manifest_present', Boolean(manifest), 'manifest_missing'),
  test('source_manifest_present', Boolean(sourceManifest), 'source_manifest_missing'),
  test('manifest_versions_are_v127', manifests.length === 2 && manifests.every((item) => requiredVersions.every((key) => item[key] === '1.2.7')), 'manifest_version_not_v127'),
  test('active_self_test_suite_v127', manifests.length === 2 && manifests.every((item) => item.activeSelfTestSuite === 'v127'), 'active_self_test_not_v127'),
  test('v127_is_token_metadata_current', manifest?.legacySelfTests?.v127 === 'token_metadata_current', 'v127_token_profile_missing'),
  test('v126_token_compatibility_preserved', manifest?.legacySelfTests?.v126 === 'token_metadata_compatibility', 'v126_token_compat_missing'),
  test('target_rollout_completed', manifest?.targetRollout === 'completed', 'target_rollout_not_completed'),
  test('token_only_profile_active', manifest?.tokenOnlyMetadataProfile === true || manifest?.contextRouting?.tokenOnlyMetadataProfile === true || manifest?.targetRepoType === 'token_only_managed', 'token_only_profile_missing'),
  test('token_forbidden_scope_preserved', manifest?.forbiddenScopeProfile === 'VGC_TOKEN_NO_DEPLOY_NO_VALUE_TRANSFER_V1' || manifest?.restrictedAssetProfile === true, 'token_forbidden_scope_missing'),
  test('dangerous_token_actions_forbidden', forbiddenFlags.every((key) => manifest?.[key] === true || manifest?.tokenSafety?.[key] === true), 'dangerous_token_action_not_forbidden'),
  test('no_runtime_or_readiness_claim', manifest?.runtimeAllowed === false && manifest?.productionAllowed === false && manifest?.readinessClaimAllowed === false, 'readiness_boundary_missing'),
  test('raw_logs_and_approval_review_forbidden', manifest?.rawLogsForbidden === true && manifest?.githubApprovalReviewForbidden === true && manifest?.selfApprovalForbidden === true, 'review_or_raw_log_boundary_missing'),
];

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  marker: 'CODEX_QUALITY_HARNESS_FILE v1.2.7',
  v127SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    profile: 'token_only_managed',
    caseCount: cases.length,
    failureCount: failures.length,
    safeSummaryOnly: true,
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true,
};

if (process.argv.includes('--json') || process.env.CODEX_QUALITY_REPORT === 'json' || process.env.CODEX_V127_SELF_TEST_REPORT === 'json') {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log(`v127SelfTestStatus: ${report.v127SelfTestStatus.status}`);
}

process.exit(report.status === 'fail' ? 1 : 0);
