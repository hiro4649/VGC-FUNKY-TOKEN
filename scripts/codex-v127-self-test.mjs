#!/usr/bin/env node
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync('docs/process/CODEX_HARNESS_MANIFEST.json', 'utf8'));
const failures = [];
if (manifest.legacySelfTests?.v127 !== 'blocking_compatibility') failures.push('v127_compat_missing');
if (manifest.finalAuthority !== 'v1.1.8_final_decision_kernel') failures.push('final_authority_changed');
const report = { v127SelfTestStatus: failures.length ? 'fail' : 'pass', status: failures.length ? 'fail' : 'pass', reasonCodes: failures };
if (process.env.CODEX_QUALITY_REPORT === 'json') console.log(JSON.stringify(report));
else if (failures.length) console.error(JSON.stringify(report, null, 2));
else console.log('v127 compatibility: pass');
process.exit(failures.length ? 1 : 0);
