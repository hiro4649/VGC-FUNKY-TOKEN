# Source Of Truth Repository Decision

VGC-FUNKY-TOKEN is the current canonical contract source repository for
FUNKY RAVE / FUNKY.

Do not duplicate contract source into a separate VGC-TOKEN repository before an
explicit owner source-of-truth decision.

If a VGC-TOKEN parent repository is created later, its default role is
docs/meta/policy/release coordination, not contract source.

The deploy target remains VGC-FUNKY-TOKEN main unless the owner explicitly
approves a pre-testnet source-of-truth migration.

Any contract source migration must happen before testnet deploy approval.

After testnet deploy, moving canonical contract source is prohibited unless
handled as a formal post-deploy migration policy with explicit owner approval.

BscScan verification source must match the chosen canonical source.

## Snapshot Guard

Run `node scripts/test-source-of-truth-repository-decision-snapshot.js` to
verify the source-of-truth decision output remains stable, non-approving, and
locked to VGC-FUNKY-TOKEN as the current canonical contract source and deploy
target.

The snapshot guard is:

- not deploy approval
- not funded transaction approval
- not governance transaction approval
- not BscScan verification approval
- not release approval
- not public visibility approval
- not readiness approval

The deployment readiness blocker registry includes this pending
source-of-truth decision as one blocker until the owner makes a later explicit
decision.

## Default Decision Fields

- canonicalContractSourceRepo: `hiro4649/VGC-FUNKY-TOKEN`
- parentVgcRepoRole: `pending_or_docs_meta_only`
- deployTargetRepo: `hiro4649/VGC-FUNKY-TOKEN`
- migrationAllowedBeforeTestnet: `explicit_owner_approval_required`
- migrationAllowedAfterTestnet: `prohibited_without_formal_policy`
- bscScanSourceAlignmentPolicy: `must_match_canonical_source`
- duplicateContractSourcePolicy: `prohibited`
- ownerDecisionStatus: `pending_owner_decision`

## Explicit Boundaries

No deploy approval.
No funded transaction approval.
No governance transaction approval.
No BscScan verification approval.
No release approval.
No public visibility approval.
No runtime readiness.
No staging readiness.
No testnet readiness.
No mainnet readiness.
