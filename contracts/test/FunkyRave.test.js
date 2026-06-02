const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

describe("FunkyRave", function () {
  const INITIAL_SUPPLY = 30_000_000_000n * 10n ** 18n;
  const REASON_REGULAR_SYNC = ethers.id("REGULAR_SYNC");
  const REASON_FIFO_DOWNGRADE = ethers.id("FIFO_DOWNGRADE");
  const REASON_ZERO_BALANCE_RESET = ethers.id("ZERO_BALANCE_RESET");
  const REASON_WEIGHTED_AVERAGE_DOWNGRADE = ethers.id("WEIGHTED_AVERAGE_DOWNGRADE");
  const REASON_TREASURY_OP = ethers.id("TREASURY_OP");
  const BATCH_MAIN = ethers.id("BATCH_MAIN");
  const BATCH_ALT = ethers.id("BATCH_ALT");
  const EXEMPT_CAT_TREASURY_LP = ethers.id("TREASURY_LP_BOOTSTRAP");
  const REQUEST_EXEMPT_1 = ethers.id("REQUEST_EXEMPT_1");

  // Fee tiers: tier key => basis points (e.g. 250 = 25%)
  const FEE_TIERS = {
    0: 250,    // Ignition 0-30 days: 25%
    31: 230,   // Stabilization 31-90: 23%
    91: 200,   // Conviction 91-180: 20%
    181: 160,  // Commitment 181-270: 16%
    271: 120,  // Core 271-360: 12%
    361: 80,   // Veteran 361-540: 8%
    541: 50,   // Ascended 541-720: 5%
    721: 30,   // Matured 721+: 3%
  };

  async function deployFunkyRaveFixture() {
    const [admin, feeRecipient, dex, user1, user2] = await ethers.getSigners();
    const FunkyRave = await ethers.getContractFactory("FunkyRave");
    const token = await FunkyRave.deploy(admin.address, feeRecipient.address);
    const MockTierUpdater = await ethers.getContractFactory("MockTierUpdater");
    const tierUpdater = await MockTierUpdater.deploy();
    await token.connect(admin).add_tier_updater(tierUpdater.target);
    const MockDexFactory = await ethers.getContractFactory("MockDexFactory");
    const factory = await MockDexFactory.deploy();
    const MockDexPair = await ethers.getContractFactory("MockDexPair");
    const pair = await MockDexPair.deploy(token.target, dex.address, factory.target);
    return { token, admin, feeRecipient, dex, user1, user2, factory, pair, tierUpdater };
  }

  describe("Deployment", function () {
    it("keeps the existing FUNKY identity for VGC Model readiness", async function () {
      const { token } = await loadFixture(deployFunkyRaveFixture);
      expect(await token.name()).to.equal("FUNKY");
      expect(await token.symbol()).to.equal("FUNKY RAVE");
    });

    it("uses OpenZeppelin ERC20 default decimals and mints constructor supply to admin", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);
      expect(await token.decimals()).to.equal(18);
      expect(await token.balanceOf(admin.address)).to.equal(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should set admin and fee recipient", async function () {
      const { token, admin, feeRecipient } = await loadFixture(deployFunkyRaveFixture);
      expect(await token.isAdmin(admin.address)).to.be.true;
      expect(await token.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should not auto-grant tier updater role to deployer EOA", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);
      expect(await token.isTierUpdater(admin.address)).to.be.false;
    });

    it("Should revert if initialAdmin or initialFeeRecipient is zero", async function () {
      const [admin, feeRecipient] = await ethers.getSigners();
      const FunkyRave = await ethers.getContractFactory("FunkyRave");
      await expect(FunkyRave.deploy(ethers.ZeroAddress, feeRecipient.address))
        .to.be.revertedWithCustomError(FunkyRave, "InvalidAddress");
      await expect(FunkyRave.deploy(admin.address, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(FunkyRave, "InvalidAddress");
    });

    it("Should set all 8 fee tiers correctly", async function () {
      const { token } = await loadFixture(deployFunkyRaveFixture);
      for (const [tierKey, feeBps] of Object.entries(FEE_TIERS)) {
        expect(await token.feePercent(tierKey)).to.equal(feeBps);
      }
    });
  });

  describe("Admin management", function () {
    it("Admin can add another admin", async function () {
      const { token, admin, user1 } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_admin(user1.address);
      expect(await token.isAdmin(user1.address)).to.be.true;
    });

    it("Non-admin cannot add admin", async function () {
      const { token, user1, user2 } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(user1).add_admin(user2.address))
        .to.be.revertedWithCustomError(token, "NotAdmin");
    });

    it("Admin can remove another admin (not last)", async function () {
      const { token, admin, user1 } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_admin(user1.address);
      await token.connect(admin).remove_admin(user1.address);
      expect(await token.isAdmin(user1.address)).to.be.false;
    });

    it("Cannot remove last admin", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(admin).remove_admin(admin.address))
        .to.be.revertedWithCustomError(token, "CannotRemoveLastAdmin");
    });

    it("Rejects EOA for tier updater role", async function () {
      const { token, admin, user1 } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(admin).add_tier_updater(user1.address))
        .to.be.revertedWithCustomError(token, "TierUpdaterMustBeContract");
    });

    it("Cannot remove the only registered tier updater contract", async function () {
      const { token, admin, tierUpdater } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(admin).remove_tier_updater(tierUpdater.target))
        .to.be.revertedWithCustomError(token, "CannotRemoveLastTierUpdater");
    });
  });

  describe("Fee configuration", function () {
    it("Admin can update fee percentage for a tier", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).update_fee_percentage(31, 200);
      expect(await token.feePercent(31)).to.equal(200);
    });

    it("Rejects unknown fee tiers", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(admin).update_fee_percentage(30, 200))
        .to.be.revertedWithCustomError(token, "InvalidTier");
    });

    it("Reverts if fee > 1000", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(admin).update_fee_percentage(0, 1001))
        .to.be.revertedWithCustomError(token, "FeeTooHigh");
    });

    it("Tier updater contract can update user holding date (tier)", async function () {
      const { token, tierUpdater, user1 } = await loadFixture(deployFunkyRaveFixture);
      await tierUpdater.updateHoldingDate(token.target, user1.address, 181, REASON_REGULAR_SYNC, BATCH_MAIN);
      expect(await token.holdingDate(user1.address)).to.equal(181);
    });

    it("Rejects unknown holding-date tiers", async function () {
      const { token, tierUpdater, user1 } = await loadFixture(deployFunkyRaveFixture);
      await expect(tierUpdater.updateHoldingDate(token.target, user1.address, 180, REASON_REGULAR_SYNC, BATCH_MAIN))
        .to.be.revertedWithCustomError(token, "InvalidTier");
    });

    it("Non-tier-updater cannot update user holding date", async function () {
      const { token, user1, user2 } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(user1).update_holding_date(user2.address, 181, REASON_REGULAR_SYNC, BATCH_MAIN))
        .to.be.revertedWithCustomError(token, "NotTierUpdater");
    });

    it("Downgrade with regular sync reason is rejected", async function () {
      const { token, tierUpdater, user1 } = await loadFixture(deployFunkyRaveFixture);
      await tierUpdater.updateHoldingDate(token.target, user1.address, 181, REASON_REGULAR_SYNC, BATCH_MAIN);
      await expect(tierUpdater.updateHoldingDate(token.target, user1.address, 31, REASON_REGULAR_SYNC, BATCH_ALT))
        .to.be.revertedWithCustomError(token, "TierDowngradeNotAllowed");
    });

    it("Downgrade is allowed with explicit downgrade reason", async function () {
      const { token, tierUpdater, user1 } = await loadFixture(deployFunkyRaveFixture);
      await tierUpdater.updateHoldingDate(token.target, user1.address, 181, REASON_REGULAR_SYNC, BATCH_MAIN);
      await tierUpdater.updateHoldingDate(token.target, user1.address, 31, REASON_FIFO_DOWNGRADE, BATCH_ALT);
      expect(await token.holdingDate(user1.address)).to.equal(31);
    });

    it("Downgrade rejects arbitrary non-regular reasons", async function () {
      const { token, tierUpdater, user1 } = await loadFixture(deployFunkyRaveFixture);
      await tierUpdater.updateHoldingDate(token.target, user1.address, 181, REASON_REGULAR_SYNC, BATCH_MAIN);
      await expect(tierUpdater.updateHoldingDate(token.target, user1.address, 31, REASON_TREASURY_OP, BATCH_ALT))
        .to.be.revertedWithCustomError(token, "InvalidReasonCode");
    });

    it("Allows zero-balance reset and weighted-average downgrade with explicit reasons", async function () {
      const { token, tierUpdater, user1 } = await loadFixture(deployFunkyRaveFixture);
      await tierUpdater.updateHoldingDate(token.target, user1.address, 361, REASON_REGULAR_SYNC, BATCH_MAIN);

      await expect(tierUpdater.updateHoldingDate(token.target, user1.address, 181, REASON_WEIGHTED_AVERAGE_DOWNGRADE, BATCH_ALT))
        .to.emit(token, "HoldingDateUpdated")
        .withArgs(user1.address, 361, 181, REASON_WEIGHTED_AVERAGE_DOWNGRADE, BATCH_ALT, tierUpdater.target);

      await tierUpdater.updateHoldingDate(token.target, user1.address, 0, REASON_ZERO_BALANCE_RESET, ethers.id("ZERO_RESET_BATCH"));
      expect(await token.holdingDate(user1.address)).to.equal(0);
    });

    it("FunkyTierUpdater separates regular sync from explicit downgrade/reset sync", async function () {
      const { token, admin, user1, user2 } = await loadFixture(deployFunkyRaveFixture);
      const FunkyTierUpdater = await ethers.getContractFactory("FunkyTierUpdater");
      const tierModule = await FunkyTierUpdater.deploy(token.target, admin.address, user2.address);
      await token.connect(admin).add_tier_updater(tierModule.target);

      await tierModule.connect(user2).syncHoldingDate(user1.address, 271, BATCH_MAIN);
      expect(await token.holdingDate(user1.address)).to.equal(271);

      await expect(tierModule.connect(user2).syncHoldingDate(user1.address, 91, BATCH_ALT))
        .to.be.revertedWithCustomError(token, "TierDowngradeNotAllowed");

      await tierModule.connect(user2).syncHoldingDateWithReason(user1.address, 91, REASON_WEIGHTED_AVERAGE_DOWNGRADE, BATCH_ALT);
      expect(await token.holdingDate(user1.address)).to.equal(91);

      await expect(tierModule.connect(user1).syncHoldingDate(user1.address, 181, ethers.id("UNAUTH_BATCH")))
        .to.be.revertedWithCustomError(tierModule, "NotRelayer");
      await expect(tierModule.connect(user2).syncHoldingDateWithReason(user1.address, 0, REASON_REGULAR_SYNC, ethers.id("BAD_REASON_BATCH")))
        .to.be.revertedWithCustomError(tierModule, "InvalidReasonCode");
    });

    it("Admin can update fee recipient", async function () {
      const { token, admin, user1 } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).update_fee_recipient(user1.address);
      expect(await token.feeRecipient()).to.equal(user1.address);
    });

    it("Admin can set and unset fee exemption with category", async function () {
      const { token, admin, user1 } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).set_fee_exempt(
        user1.address,
        true,
        REASON_TREASURY_OP,
        EXEMPT_CAT_TREASURY_LP,
        REQUEST_EXEMPT_1,
        admin.address,
        admin.address
      );
      expect(await token.isFeeExempt(user1.address)).to.equal(true);
      expect(await token.exemptAddressCount()).to.equal(1);

      await token.connect(admin).set_fee_exempt(
        user1.address,
        false,
        REASON_TREASURY_OP,
        EXEMPT_CAT_TREASURY_LP,
        ethers.id("REQUEST_EXEMPT_2"),
        admin.address,
        admin.address
      );
      expect(await token.isFeeExempt(user1.address)).to.equal(false);
      expect(await token.exemptAddressCount()).to.equal(0);
    });

    it("Reverts fee exemption when cap is exceeded", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);

      for (let i = 1; i <= 20; i++) {
        const targetAddress = ethers.Wallet.createRandom().address;
        await token.connect(admin).set_fee_exempt(
          targetAddress,
          true,
          REASON_TREASURY_OP,
          EXEMPT_CAT_TREASURY_LP,
          ethers.id(`REQUEST_CAP_${i}`),
          admin.address,
          admin.address
        );
      }

      await expect(
        token.connect(admin).set_fee_exempt(
          ethers.Wallet.createRandom().address,
          true,
          REASON_TREASURY_OP,
          EXEMPT_CAT_TREASURY_LP,
          ethers.id("REQUEST_CAP_21"),
          admin.address,
          admin.address
        )
      ).to.be.revertedWithCustomError(token, "ExemptAddressCapReached");
    });
  });

  describe("DEX list", function () {
    it("Admin can add and remove DEX", async function () {
      const { token, admin, pair, factory } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_factory(factory.target);
      await token.connect(admin).add_dex(pair.target);
      expect(await token.isDex(pair.target)).to.be.true;
      await token.connect(admin).remove_dex(pair.target);
      expect(await token.isDex(pair.target)).to.be.false;
    });

    it("Cannot add zero address as DEX", async function () {
      const { token, admin } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(admin).add_dex(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(token, "InvalidAddress");
    });

    it("Cannot add pair if factory is not allowlisted", async function () {
      const { token, admin, pair } = await loadFixture(deployFunkyRaveFixture);
      await expect(token.connect(admin).add_dex(pair.target))
        .to.be.revertedWithCustomError(token, "FactoryNotRegistered");
    });
  });

  describe("Transfers and fees", function () {
    it("Transfer to non-DEX: no fee", async function () {
      const { token, admin, feeRecipient, user1, user2 } = await loadFixture(deployFunkyRaveFixture);
      const amount = 1000n * 10n ** 18n;
      await token.connect(admin).transfer(user1.address, amount);
      const feeRecipientBefore = await token.balanceOf(feeRecipient.address);
      await token.connect(user1).transfer(user2.address, amount);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
      expect(await token.balanceOf(feeRecipient.address)).to.equal(feeRecipientBefore);
    });

    it("Transfer to DEX (sell): fee applied based on sender holding tier", async function () {
      const { token, admin, feeRecipient, pair, factory, user1, tierUpdater } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_factory(factory.target);
      await token.connect(admin).add_dex(pair.target);
      // User1 tier 0 (Ignition) => 25% fee
      await tierUpdater.updateHoldingDate(token.target, user1.address, 0, REASON_REGULAR_SYNC, BATCH_MAIN);
      const amount = 1000n * 10n ** 18n;
      await token.connect(admin).transfer(user1.address, amount);

      const feeRecipientBefore = await token.balanceOf(feeRecipient.address);
      await token.connect(user1).transfer(pair.target, amount);

      const expectedFee = (amount * 250n) / 1000n; // 25%
      const expectedNet = amount - expectedFee;
      expect(await token.balanceOf(pair.target)).to.equal(expectedNet);
      expect(await token.balanceOf(feeRecipient.address)).to.equal(feeRecipientBefore + expectedFee);
    });

    it("Transfer to DEX: different tiers have different fee %", async function () {
      const { token, admin, feeRecipient, pair, factory, user1, tierUpdater } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_factory(factory.target);
      await token.connect(admin).add_dex(pair.target);
      const amount = 1000n * 10n ** 18n;
      await token.connect(admin).transfer(user1.address, amount);

      // Tier 721 (Matured) = 3%
      await tierUpdater.updateHoldingDate(token.target, user1.address, 721, REASON_REGULAR_SYNC, BATCH_MAIN);
      await token.connect(user1).transfer(pair.target, amount);
      const expectedFee721 = (amount * 30n) / 1000n;
      expect(await token.balanceOf(feeRecipient.address)).to.equal(expectedFee721);
      expect(await token.balanceOf(pair.target)).to.equal(amount - expectedFee721);
    });

    it("Transfer to DEX when user tier has 0 fee: no fee taken", async function () {
      const { token, admin, feeRecipient, pair, factory, user1, tierUpdater } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_factory(factory.target);
      await token.connect(admin).add_dex(pair.target);
      await token.connect(admin).update_fee_percentage(0, 0); // set tier 0 to 0%
      await tierUpdater.updateHoldingDate(token.target, user1.address, 0, REASON_REGULAR_SYNC, BATCH_MAIN);
      const amount = 1000n * 10n ** 18n;
      await token.connect(admin).transfer(user1.address, amount);
      const feeRecipientBefore = await token.balanceOf(feeRecipient.address);
      await token.connect(user1).transfer(pair.target, amount);
      expect(await token.balanceOf(feeRecipient.address)).to.equal(feeRecipientBefore);
      expect(await token.balanceOf(pair.target)).to.equal(amount);
    });

    it("transferFrom to DEX uses token owner's tier, not spender tier", async function () {
      const { token, admin, feeRecipient, pair, factory, user1, user2, tierUpdater } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_factory(factory.target);
      await token.connect(admin).add_dex(pair.target);

      // Owner (user1) should be charged as Matured (3%), while spender (user2) stays default tier 0 (25%)
      await tierUpdater.updateHoldingDate(token.target, user1.address, 721, REASON_REGULAR_SYNC, BATCH_MAIN);
      const amount = 1000n * 10n ** 18n;
      await token.connect(admin).transfer(user1.address, amount);

      await token.connect(user1).approve(user2.address, amount);

      const feeRecipientBefore = await token.balanceOf(feeRecipient.address);
      await token.connect(user2).transferFrom(user1.address, pair.target, amount);

      const expectedFee = (amount * 30n) / 1000n; // user1 tier 721 => 3%
      const expectedNet = amount - expectedFee;

      expect(await token.balanceOf(pair.target)).to.equal(expectedNet);
      expect(await token.balanceOf(feeRecipient.address)).to.equal(feeRecipientBefore + expectedFee);
    });

    it("Fee-exempt sender is not charged when transferring to DEX pair", async function () {
      const { token, admin, feeRecipient, pair, factory, user1, tierUpdater } = await loadFixture(deployFunkyRaveFixture);
      await token.connect(admin).add_factory(factory.target);
      await token.connect(admin).add_dex(pair.target);
      await tierUpdater.updateHoldingDate(token.target, user1.address, 0, REASON_REGULAR_SYNC, BATCH_MAIN);
      await token.connect(admin).set_fee_exempt(
        user1.address,
        true,
        REASON_TREASURY_OP,
        EXEMPT_CAT_TREASURY_LP,
        ethers.id("REQUEST_EXEMPT_SELL"),
        admin.address,
        admin.address
      );

      const amount = 1000n * 10n ** 18n;
      await token.connect(admin).transfer(user1.address, amount);
      const feeRecipientBefore = await token.balanceOf(feeRecipient.address);
      await token.connect(user1).transfer(pair.target, amount);

      expect(await token.balanceOf(feeRecipient.address)).to.equal(feeRecipientBefore);
      expect(await token.balanceOf(pair.target)).to.equal(amount);
    });
  });

  describe("Deployment script readiness", function () {
    it("keeps FUNKY deploy and governance scripts gated by explicit env vars", function () {
      const deployScript = fs.readFileSync(path.join(__dirname, "..", "scripts", "deploy-funky.js"), "utf8");
      const governanceScript = fs.readFileSync(path.join(__dirname, "..", "scripts", "configure-funky-governance.js"), "utf8");

      expect(deployScript).to.include('requireEnv("FUNKY_INITIAL_ADMIN")');
      expect(deployScript).to.include('requireEnv("FUNKY_INITIAL_FEE_RECIPIENT")');
      expect(deployScript).to.include("Set PRIVATE_KEY before deploying.");

      expect(governanceScript).to.include('requireEnv("FUNKY_TOKEN_ADDRESS")');
      expect(governanceScript).to.include("FUNKY_TIER_UPDATER");
      expect(governanceScript).to.include("FUNKY_TRUSTED_FACTORIES");
      expect(governanceScript).to.include("FUNKY_INITIAL_PAIRS");
      expect(governanceScript).to.include("Set PRIVATE_KEY in env.");
    });
  });
});
