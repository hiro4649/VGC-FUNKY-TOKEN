#!/usr/bin/env node
const version = {
  marker: 'CODEX_QUALITY_HARNESS_FILE v1.2.9',
  activeHarnessVersion: '1.2.9',
  targetHarnessVersion: '1.2.9',
  activeSelfTestSuite: 'v129',
  targetRollout: 'completed',
  rolloutClass: 'restricted_token',
  materialization: 'metadata_only_readonly'
};
if (process.env.CODEX_QUALITY_REPORT === 'json') {
  console.log(JSON.stringify(version));
} else {
  console.log('HARNESS v1.2.9 target profile active');
}
