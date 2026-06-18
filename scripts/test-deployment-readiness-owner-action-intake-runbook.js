const fs = require('fs');
const path = require('path');

const runbookPath = path.resolve(
  __dirname,
  '..',
  'docs',
  'deployment-readiness-owner-action-intake-runbook.md',
);
const text = fs.readFileSync(runbookPath, 'utf8');
const normalizedText = text.replace(/\s+/g, ' ');

function fail(message) {
  console.error(`owner action intake runbook guard failed: ${message}`);
  process.exit(1);
}

function requireIncludes(value, label) {
  if (!text.includes(value)) {
    fail(`missing ${label}`);
  }
}

function requireNormalizedIncludes(value, label) {
  if (!normalizedText.includes(value)) {
    fail(`missing ${label}`);
  }
}

const requiredSections = [
  'Purpose',
  'Current status',
  'What the owner may submit later',
  'What the owner must never submit',
  'How to use the GitHub issue template',
  'What the parser does',
  'What the review packet does',
  'What the intake checks do',
  'What the intake artifact does',
  'What the final gate proves',
  'What remains blocked',
  'Separate deploy approval still required',
  'Separate funded transaction approval still required',
  'Separate governance transaction approval still required',
  'Separate BscScan verification approval still required',
  'No release approval',
  'No visibility change approval',
  'No runtime readiness approval',
  'No staging readiness approval',
  'No testnet readiness approval',
  'No mainnet readiness approval',
];

for (const section of requiredSections) {
  requireIncludes(`## ${section}`, `section: ${section}`);
}

const safePublicFields = [
  'BNB Smart Chain testnet approval',
  'initialAdmin public address',
  'initialFeeRecipient public address',
  'deploy command approval text',
  'BscScan verification plan text',
  'multisig policy',
  'admin rotation policy',
  'feeRecipient policy',
  'TierUpdater policy',
  'trusted factory policy',
  'pair policy',
  'fee exemption policy',
  'fee max policy',
  'fee denominator policy',
  'sell/LP-add fee behavior policy',
  'tier updater last-removal policy',
  'fee exemption proposer/approver policy',
  'tier updater code-presence validation policy',
  'source-of-truth repository decision',
  'repository visibility decision',
];

for (const field of safePublicFields) {
  requireIncludes(field, `safe public field: ${field}`);
}

const forbiddenWarnings = [
  'private keys',
  'mnemonics',
  'RPC URLs',
  'API keys',
  '.env contents',
  'DB URLs',
  'JWTs',
  'cookies',
  'wallet funding proof',
  'screenshots showing wallet secrets',
  'BscScan API keys',
  'deployer private material',
  'seed phrases',
  'any secret-like value',
];

for (const warning of forbiddenWarnings) {
  requireIncludes(warning, `forbidden warning: ${warning}`);
}

const nonApprovals = [
  'not deploy approval',
  'not funded transaction approval',
  'not governance transaction approval',
  'not BscScan verification approval',
  'not release approval',
  'not visibility approval',
  'not readiness',
];

for (const phrase of nonApprovals) {
  requireIncludes(phrase, `non-approval boundary: ${phrase}`);
}

requireIncludes(
  'A later explicit deploy instruction is still required',
  'later explicit deploy instruction requirement',
);
requireNormalizedIncludes(
  'Deployer funding is handled separately by owner and must not be posted in GitHub',
  'separate deployer funding handling',
);

const unsafePatterns = [
  { label: 'real EVM address', regex: /0x[a-fA-F0-9]{40}/ },
  { label: 'private-key-like hex', regex: /0x[a-fA-F0-9]{64}/ },
  { label: 'RPC URL', regex: /\b(?:https?|wss?):\/\/[^\s)]*(?:rpc|alchemy|infura|quicknode|ankr|moralis|chainstack|getblock|nodereal|bsc-dataseed)[^\s)]*/i },
  { label: 'DB URL', regex: /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\//i },
  { label: 'JWT', regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { label: 'cookie assignment', regex: /\bcookie\s*[:=]/i },
  { label: '.env assignment', regex: /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*[^\s#]+/m },
  { label: 'API key assignment', regex: /\bapi[_ -]?key\s*[:=]\s*['"`]?[A-Za-z0-9_-]{20,}/i },
];

for (const pattern of unsafePatterns) {
  if (pattern.regex.test(text)) {
    fail(`unsafe ${pattern.label}`);
  }
}

const approvalRiskPatterns = [
  new RegExp(`\\bdeploy(?:ment)? approval ${'granted'}\\b`, 'i'),
  new RegExp(`\\bfunded transaction approval ${'granted'}\\b`, 'i'),
  new RegExp(`\\bgovernance transaction approval ${'granted'}\\b`, 'i'),
  new RegExp(`\\bBscScan verification approval ${'granted'}\\b`, 'i'),
  new RegExp(`\\breadiness ${'app'}${'roved'}\\b`, 'i'),
  new RegExp(`\\bsafeToDeploy:\\s*${'true'}\\b`),
  new RegExp(`\\bsafeToPerformFundedTransaction:\\s*${'true'}\\b`),
  new RegExp(`\\bsafeToPerformGovernanceTransaction:\\s*${'true'}\\b`),
  new RegExp(`\\bsafeToVerifyBscScan:\\s*${'true'}\\b`),
  new RegExp(`\\bsafeToClaimReadiness:\\s*${'true'}\\b`),
];

for (const regex of approvalRiskPatterns) {
  if (regex.test(text)) {
    fail('approval or readiness claim wording');
  }
}

for (const flag of [
  'safeToDeploy',
  'safeToPerformFundedTransaction',
  'safeToPerformGovernanceTransaction',
  'safeToVerifyBscScan',
  'safeToClaimReadiness',
]) {
  if (!new RegExp(`${flag}\`? remains false`).test(text)) {
    fail(`missing ${flag} false statement`);
  }
}

console.log('deployment readiness owner action intake runbook guard passed');
