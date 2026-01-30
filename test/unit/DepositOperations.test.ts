import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployWithPlanFixture } from "../helpers/fixtures";
import { ONE_USDC, DEFAULT_PLAN } from "../helpers/constants";

describe("Deposit Operations", function () {
  describe("createDeposit - Success", function () {
    it("should create deposit successfully", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const amount = 1000n * ONE_USDC;
      const termDays = 60;

      await usdc.connect(user1).approve(savingBank.target, amount);
      await expect(savingBank.connect(user1).createDeposit(1, amount, termDays)).to.emit(savingBank, "DepositCreated");

      const deposit = await savingBank.getDeposit(1);
      expect(deposit.amount).to.equal(amount);
      expect(deposit.termDays).to.equal(termDays);
      expect(deposit.planId).to.equal(1n);
      expect(deposit.isClosed).to.be.false;
    });

    it("should mint NFT to user", async function () {
      const { savingBank, usdc, certificate, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 60);

      // depositId = 1, tokenId = depositId
      expect(await certificate.ownerOf(1)).to.equal(user1.address);
    });

    it("should transfer USDC to vault", async function () {
      const { savingBank, usdc, vault, user1 } = await loadFixture(deployWithPlanFixture);

      const balanceBefore = await vault.getBalance();
      const amount = 2000n * ONE_USDC;

      await usdc.connect(user1).approve(savingBank.target, amount);
      await savingBank.connect(user1).createDeposit(1, amount, 90);

      expect(await vault.getBalance()).to.equal(balanceBefore + amount);
    });

    it("should calculate correct maturity time", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const termDays = 90;
      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, termDays);

      const deposit = await savingBank.getDeposit(1);
      const expectedMaturity = deposit.startTime + BigInt(termDays * 24 * 60 * 60);
      expect(deposit.maturityTime).to.equal(expectedMaturity);
    });
  });

  describe("createDeposit - Validation", function () {
    it("should reject when plan not found", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(99, 1000n * ONE_USDC, 60)).to.be.revertedWithCustomError(
        savingBank,
        "PlanNotFound"
      );
    });

    it("should reject when plan inactive", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await savingBank.setPlanActive(1, false);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 60)).to.be.revertedWithCustomError(
        savingBank,
        "PlanNotActive"
      );
    });

    it("should reject when amount < minAmount", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const smallAmount = 10n * ONE_USDC; // minAmount = 100

      await usdc.connect(user1).approve(savingBank.target, smallAmount);
      await expect(savingBank.connect(user1).createDeposit(1, smallAmount, 60)).to.be.revertedWithCustomError(
        savingBank,
        "InvalidAmount"
      );
    });

    it("should reject when amount > maxAmount (if maxAmount set)", async function () {
      const { savingBank, usdc, admin, user1 } = await loadFixture(deployWithPlanFixture);

      // Create plan with maxAmount
      await savingBank.createPlan({
        ...DEFAULT_PLAN,
        name: "Limited Plan",
        maxAmount: 5000n * ONE_USDC,
      });

      // Add liquidity
      await usdc.connect(admin).approve(savingBank.target, 100_000n * ONE_USDC);
      await savingBank.depositToVault(100_000n * ONE_USDC);

      const bigAmount = 10_000n * ONE_USDC;
      await usdc.connect(user1).approve(savingBank.target, bigAmount);
      await expect(savingBank.connect(user1).createDeposit(2, bigAmount, 60)).to.be.revertedWithCustomError(
        savingBank,
        "InvalidAmount"
      );
    });

    it("should reject when term < minTermDays", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 10)) // min = 30
        .to.be.revertedWithCustomError(savingBank, "InvalidTerm");
    });

    it("should reject when term > maxTermDays", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 500)) // max = 365
        .to.be.revertedWithCustomError(savingBank, "InvalidTerm");
    });

    it("should reject when paused", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await savingBank.pause();

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 60)).to.be.revertedWithCustomError(
        savingBank,
        "EnforcedPause"
      );
    });
  });

  describe("Multiple deposits", function () {
    it("should handle multiple deposits from same user", async function () {
      const { savingBank, usdc, certificate, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 5000n * ONE_USDC);

      await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 30);
      await savingBank.connect(user1).createDeposit(1, 2000n * ONE_USDC, 60);
      await savingBank.connect(user1).createDeposit(1, 2000n * ONE_USDC, 90);

      // User owns 3 NFTs
      expect(await certificate.balanceOf(user1.address)).to.equal(3n);

      // Check deposits
      expect((await savingBank.getDeposit(1)).amount).to.equal(1000n * ONE_USDC);
      expect((await savingBank.getDeposit(2)).amount).to.equal(2000n * ONE_USDC);
      expect((await savingBank.getDeposit(3)).amount).to.equal(2000n * ONE_USDC);
    });

    it("should handle deposits from multiple users", async function () {
      const { savingBank, usdc, certificate, user1, user2 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await usdc.connect(user2).approve(savingBank.target, 2000n * ONE_USDC);

      await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 60);
      await savingBank.connect(user2).createDeposit(1, 2000n * ONE_USDC, 90);

      expect(await certificate.ownerOf(1)).to.equal(user1.address);
      expect(await certificate.ownerOf(2)).to.equal(user2.address);
    });
  });

  describe("Edge cases", function () {
    it("should accept deposit with exact minAmount", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const minAmount = DEFAULT_PLAN.minAmount;
      await usdc.connect(user1).approve(savingBank.target, minAmount);
      await expect(savingBank.connect(user1).createDeposit(1, minAmount, 60)).to.emit(savingBank, "DepositCreated");
    });

    it("should accept deposit with exact minTermDays", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, DEFAULT_PLAN.minTermDays)).to.emit(
        savingBank,
        "DepositCreated"
      );
    });

    it("should accept deposit with exact maxTermDays", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, DEFAULT_PLAN.maxTermDays)).to.emit(
        savingBank,
        "DepositCreated"
      );
    });
  });
});
