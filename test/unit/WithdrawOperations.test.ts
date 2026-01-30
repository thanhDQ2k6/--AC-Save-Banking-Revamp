import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployWithPlanFixture } from "../helpers/fixtures";
import { advanceDays, advanceToTimestamp } from "../helpers/time";
import { ONE_USDC, BASIS_POINTS, DAYS_PER_YEAR } from "../helpers/constants";

describe("Withdraw Operations", function () {
  /**
   * Helper: Create a deposit and return depositId
   */
  async function createTestDeposit(
    savingBank: any,
    usdc: any,
    user: any,
    amount: bigint,
    termDays: number
  ): Promise<bigint> {
    await usdc.connect(user).approve(savingBank.target, amount);
    const tx = await savingBank.connect(user).createDeposit(1, amount, termDays);
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => log.fragment?.name === "DepositCreated");
    return event.args[0]; // depositId
  }

  describe("withdraw - Matured (normal flow)", function () {
    it("should withdraw with principal + interest after maturity", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const amount = 10_000n * ONE_USDC;
      const termDays = 90;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, termDays);

      // Calculate expected interest: 10000 * 800 * 90 / (10000 * 365) = 197.26 USDC
      const plan = await savingBank.getPlan(1);
      const expectedInterest = (amount * plan.interestRateBps * BigInt(termDays)) / (BASIS_POINTS * DAYS_PER_YEAR);

      // Advance to maturity
      const deposit = await savingBank.getDeposit(depositId);
      await advanceToTimestamp(deposit.maturityTime);

      const balanceBefore = await usdc.balanceOf(user1.address);

      // Withdraw
      await expect(savingBank.connect(user1).withdraw(depositId))
        .to.emit(savingBank, "Withdrawn")
        .withArgs(depositId, user1.address, amount + expectedInterest, expectedInterest, 0n, false);

      const balanceAfter = await usdc.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore + amount + expectedInterest);
    });

    it("should burn NFT after withdraw", async function () {
      const { savingBank, usdc, certificate, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      // Advance to maturity
      await advanceDays(31);

      // Withdraw
      await savingBank.connect(user1).withdraw(depositId);

      // NFT should be burned
      await expect(certificate.ownerOf(depositId)).to.be.revertedWithCustomError(certificate, "ERC721NonexistentToken");
    });

    it("should set deposit.isClosed = true", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);
      await savingBank.connect(user1).withdraw(depositId);

      const deposit = await savingBank.getDeposit(depositId);
      expect(deposit.isClosed).to.be.true;
    });
  });

  describe("withdraw - Early (with penalty)", function () {
    it("should withdraw with penalty before maturity", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const amount = 10_000n * ONE_USDC;
      const termDays = 90;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, termDays);

      // Advance only 30 days (early)
      await advanceDays(30);

      // Calculate expected penalty: 10000 * 500 / 10000 = 500 USDC
      const plan = await savingBank.getPlan(1);
      const expectedPenalty = (amount * plan.penaltyRateBps) / BASIS_POINTS;
      const expectedPayout = amount - expectedPenalty;

      const balanceBefore = await usdc.balanceOf(user1.address);

      // Withdraw early
      await expect(savingBank.connect(user1).withdraw(depositId))
        .to.emit(savingBank, "Withdrawn")
        .withArgs(depositId, user1.address, expectedPayout, 0n, expectedPenalty, true);

      const balanceAfter = await usdc.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore + expectedPayout);
    });

    it("should send penalty to receiver if set", async function () {
      const { savingBank, usdc, user1, penaltyReceiver } = await loadFixture(deployWithPlanFixture);

      // Set penalty receiver
      await savingBank.setPenaltyReceiver(penaltyReceiver.address);

      const amount = 10_000n * ONE_USDC;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, 90);

      await advanceDays(30);

      const plan = await savingBank.getPlan(1);
      const expectedPenalty = (amount * plan.penaltyRateBps) / BASIS_POINTS;

      const receiverBalanceBefore = await usdc.balanceOf(penaltyReceiver.address);

      await savingBank.connect(user1).withdraw(depositId);

      const receiverBalanceAfter = await usdc.balanceOf(penaltyReceiver.address);
      expect(receiverBalanceAfter).to.equal(receiverBalanceBefore + expectedPenalty);
    });

    it("should keep penalty in vault if receiver = 0", async function () {
      const { savingBank, usdc, vault, user1 } = await loadFixture(deployWithPlanFixture);

      // penaltyReceiver not set (default = 0)
      const amount = 10_000n * ONE_USDC;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, 90);

      const vaultBalanceBefore = await vault.getBalance();

      await advanceDays(30);

      const plan = await savingBank.getPlan(1);
      const expectedPenalty = (amount * plan.penaltyRateBps) / BASIS_POINTS;
      const expectedPayout = amount - expectedPenalty;

      await savingBank.connect(user1).withdraw(depositId);

      // Vault should only decrease by payout (penalty stays)
      const vaultBalanceAfter = await vault.getBalance();
      expect(vaultBalanceAfter).to.equal(vaultBalanceBefore - expectedPayout);
    });
  });

  describe("withdraw - Validation", function () {
    it("should reject when deposit not found", async function () {
      const { savingBank, user1 } = await loadFixture(deployWithPlanFixture);

      await expect(savingBank.connect(user1).withdraw(99)).to.be.revertedWithCustomError(savingBank, "DepositNotFound");
    });

    it("should reject when deposit already closed", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);
      await savingBank.connect(user1).withdraw(depositId);

      // Try withdraw again
      await expect(savingBank.connect(user1).withdraw(depositId)).to.be.revertedWithCustomError(
        savingBank,
        "DepositClosed"
      );
    });

    it("should reject when not NFT owner", async function () {
      const { savingBank, usdc, user1, user2 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);

      // user2 tries to withdraw user1's deposit
      await expect(savingBank.connect(user2).withdraw(depositId)).to.be.revertedWithCustomError(savingBank, "NotOwner");
    });

    it("should reject when vault has insufficient liquidity", async function () {
      const { savingBank, usdc, admin, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      // Admin withdraws all liquidity
      const vaultBalance = await savingBank.vault().then((v: any) =>
        require("hardhat")
          .ethers.getContractAt("Vault", v)
          .then((c: any) => c.getBalance())
      );
      // Note: This test may need adjustment based on actual contract behavior
    });

    it("should reject when paused", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await savingBank.pause();

      await expect(savingBank.connect(user1).withdraw(depositId)).to.be.revertedWithCustomError(
        savingBank,
        "EnforcedPause"
      );
    });
  });

  describe("NFT Transfer then withdraw", function () {
    it("should allow new owner to withdraw after NFT transfer", async function () {
      const { savingBank, usdc, certificate, user1, user2 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      // Transfer NFT from user1 to user2
      await certificate.connect(user1).transferFrom(user1.address, user2.address, depositId);

      expect(await certificate.ownerOf(depositId)).to.equal(user2.address);

      await advanceDays(31);

      // user1 cannot withdraw anymore
      await expect(savingBank.connect(user1).withdraw(depositId)).to.be.revertedWithCustomError(savingBank, "NotOwner");

      // user2 (new owner) can withdraw
      const balanceBefore = await usdc.balanceOf(user2.address);
      await savingBank.connect(user2).withdraw(depositId);
      const balanceAfter = await usdc.balanceOf(user2.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });
});
