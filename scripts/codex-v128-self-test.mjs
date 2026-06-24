#!/usr/bin/env node
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync('docs/process/CODEX_HARNESS_MANIFEST.json', 'utf8'));
const failures = [];
if (manifest.activeHarnessVersion !== '1.2.9') failures.push('active_version_not_v129');
if (manifest.versioningRollback?.activeHarnessVersion !== '1.2.8') failures.push('rollback_version_not_v128');
if (manifest.versioningRollback?.activeSelfTestSuite !== 'v128') failures.push('rollback_suite_not_v128');
if (manifest.versioningRollback?.rollbackAvailable !== true) failures.push('rollback_unavailable');
if (manifest.legacySelfTests?.v128 !== 'blocking_compatibility_rollback') failures.push('v128_compat_missing');
const report = { v128SelfTestStatus: failures.length ? 'fail' : 'pass', status: failures.length ? 'fail' : 'pass', reasonCodes: failures };
if (process.env.CODEX_QUALITY_REPORT === 'json') console.log(JSON.stringify(report));
else if (failures.length) console.error(JSON.stringify(report, null, 2));
else console.log('v128 rollback compatibility: pass');
process.exit(failures.length ? 1 : 0);
