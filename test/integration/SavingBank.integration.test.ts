import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployWithPlanFixture } from "../helpers/fixtures";
import { advanceDays, advanceToTimestamp } from "../helpers/time";
import { ONE_USDC, BASIS_POINTS, DAYS_PER_YEAR, PREMIUM_PLAN } from "../helpers/constants";

describe("SavingBank Integration Tests", function () {
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
    return event.args[0];
  }

  describe("Complete deposit lifecycle", function () {
    it("should handle full lifecycle: create -> matured withdraw", async function () {
      const { savingBank, usdc, vault, user1 } = await loadFixture(deployWithPlanFixture);

      const amount = 10_000n * ONE_USDC;
      const termDays = 30;

      // Record initial balances
      const userInitialBalance = await usdc.balanceOf(user1.address);
      const vaultInitialBalance = await usdc.balanceOf(vault.target);

      // 1. Create deposit
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, termDays);

      // Verify funds moved to vault
      expect(await usdc.balanceOf(vault.target)).to.equal(vaultInitialBalance + amount);

      // 2. Advance to maturity
      await advanceDays(31);

      // 3. Withdraw
      await savingBank.connect(user1).withdraw(depositId);

      // 4. Verify final state
      const deposit = await savingBank.getDeposit(depositId);
      expect(deposit.isClosed).to.be.true;

      // Calculate expected interest
      const plan = await savingBank.getPlan(1);
      const expectedInterest = (amount * plan.interestRateBps * BigInt(termDays)) / (BASIS_POINTS * DAYS_PER_YEAR);
      const expectedTotal = amount + expectedInterest;

      // User should receive principal + interest
      const userFinalBalance = await usdc.balanceOf(user1.address);
      expect(userFinalBalance).to.equal(userInitialBalance - amount + expectedTotal);
    });

    it("should handle full lifecycle: create -> early withdraw", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const amount = 10_000n * ONE_USDC;
      const termDays = 90;

      const userInitialBalance = await usdc.balanceOf(user1.address);

      // Create deposit
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, termDays);

      // Wait 30 days (not matured)
      await advanceDays(30);

      // Withdraw early
      await savingBank.connect(user1).withdraw(depositId);

      // Verify deposit closed
      const deposit = await savingBank.getDeposit(depositId);
      expect(deposit.isClosed).to.be.true;

      // User should receive principal - penalty
      const plan = await savingBank.getPlan(1);
      const penalty = (amount * BigInt(plan.penaltyRateBps)) / BASIS_POINTS;
      const expectedAmount = amount - penalty;

      const userFinalBalance = await usdc.balanceOf(user1.address);
      expect(userFinalBalance).to.equal(userInitialBalance - amount + expectedAmount);
    });

    it("should handle full lifecycle: create -> matured -> renew -> withdraw", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const amount = 10_000n * ONE_USDC;
      const termDays = 30;

      const userInitialBalance = await usdc.balanceOf(user1.address);

      // 1. Create deposit
      const depositId1 = await createTestDeposit(savingBank, usdc, user1, amount, termDays);

      // 2. Matured
      await advanceDays(31);

      // 3. Renew
      await savingBank.connect(user1).renew(depositId1, 1, 60);
      const depositId2 = 2n;

      // Old deposit closed
      const oldDeposit = await savingBank.getDeposit(depositId1);
      expect(oldDeposit.isClosed).to.be.true;

      // Calculate new amount after first term
      const plan = await savingBank.getPlan(1);
      const interest1 = (amount * plan.interestRateBps * BigInt(termDays)) / (BASIS_POINTS * DAYS_PER_YEAR);
      const newAmount = amount + interest1;

      const newDeposit = await savingBank.getDeposit(depositId2);
      expect(newDeposit.amount).to.equal(newAmount);

      // 4. Mature again and withdraw
      await advanceDays(61);
      await savingBank.connect(user1).withdraw(depositId2);

      // Calculate final interest
      const interest2 = (newAmount * plan.interestRateBps * 60n) / (BASIS_POINTS * DAYS_PER_YEAR);
      const finalAmount = newAmount + interest2;

      const userFinalBalance = await usdc.balanceOf(user1.address);
      expect(userFinalBalance).to.equal(userInitialBalance - amount + finalAmount);
    });
  });

  describe("Multiple users", function () {
    it("should handle multiple users depositing and withdrawing", async function () {
      const { savingBank, usdc, admin, user1, user2 } = await loadFixture(deployWithPlanFixture);

      const amount1 = 5000n * ONE_USDC;
      const amount2 = 8000n * ONE_USDC;

      // Add more liquidity
      await usdc.connect(admin).approve(savingBank.target, 500_000n * ONE_USDC);
      await savingBank.depositToVault(500_000n * ONE_USDC);

      // User1 creates deposit
      const depositId1 = await createTestDeposit(savingBank, usdc, user1, amount1, 30);

      // User2 creates deposit
      const depositId2 = await createTestDeposit(savingBank, usdc, user2, amount2, 60);

      // Advance 31 days - user1 can withdraw matured
      await advanceDays(31);

      await savingBank.connect(user1).withdraw(depositId1);
      const deposit1 = await savingBank.getDeposit(depositId1);
      expect(deposit1.isClosed).to.be.true;

      // User2's deposit still active
      const deposit2 = await savingBank.getDeposit(depositId2);
      expect(deposit2.isClosed).to.be.false;

      // Advance 30 more days - user2 matured
      await advanceDays(30);

      await savingBank.connect(user2).withdraw(depositId2);
      const deposit2After = await savingBank.getDeposit(depositId2);
      expect(deposit2After.isClosed).to.be.true;
    });

    it("should track deposits correctly across users", async function () {
      const { savingBank, usdc, user1, user2 } = await loadFixture(deployWithPlanFixture);

      // Multiple deposits from different users
      await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);
      await createTestDeposit(savingBank, usdc, user2, 2000n * ONE_USDC, 60);
      await createTestDeposit(savingBank, usdc, user1, 3000n * ONE_USDC, 90);

      // Check all deposits exist
      const deposit1 = await savingBank.getDeposit(1);
      const deposit2 = await savingBank.getDeposit(2);
      const deposit3 = await savingBank.getDeposit(3);

      expect(deposit1.amount).to.equal(1000n * ONE_USDC);
      expect(deposit2.amount).to.equal(2000n * ONE_USDC);
      expect(deposit3.amount).to.equal(3000n * ONE_USDC);
    });
  });

  describe("NFT Transfer scenarios", function () {
    it("should allow NFT recipient to withdraw", async function () {
      const { savingBank, usdc, certificate, user1, user2 } = await loadFixture(deployWithPlanFixture);

      const amount = 5000n * ONE_USDC;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, 30);

      const user2InitialBalance = await usdc.balanceOf(user2.address);

      // Transfer NFT to user2
      await certificate.connect(user1).transferFrom(user1.address, user2.address, depositId);

      // Advance to maturity
      await advanceDays(31);

      // user1 cannot withdraw
      await expect(savingBank.connect(user1).withdraw(depositId)).to.be.revertedWithCustomError(savingBank, "NotOwner");

      // user2 can withdraw
      await savingBank.connect(user2).withdraw(depositId);

      // user2 receives the funds
      const user2FinalBalance = await usdc.balanceOf(user2.address);
      expect(user2FinalBalance).to.be.gt(user2InitialBalance);
    });

    it("should allow NFT marketplace-style transfer", async function () {
      const { savingBank, usdc, certificate, user1, user2 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 10_000n * ONE_USDC, 90);

      // Approve marketplace (simulated by user2)
      await certificate.connect(user1).approve(user2.address, depositId);

      // Marketplace executes transfer
      await certificate.connect(user2).transferFrom(user1.address, user2.address, depositId);

      // Verify ownership
      expect(await certificate.ownerOf(depositId)).to.equal(user2.address);
    });
  });

  describe("Vault liquidity management", function () {
    it("should maintain proper vault balance through deposits and withdrawals", async function () {
      const { savingBank, usdc, vault, user1 } = await loadFixture(deployWithPlanFixture);

      const vaultInitial = await usdc.balanceOf(vault.target);

      // Create deposit
      const amount = 5000n * ONE_USDC;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, 30);

      // Vault should increase by deposit amount
      expect(await usdc.balanceOf(vault.target)).to.equal(vaultInitial + amount);

      // Mature and withdraw
      await advanceDays(31);
      await savingBank.connect(user1).withdraw(depositId);

      // Vault should decrease (principal + interest)
      const plan = await savingBank.getPlan(1);
      const interest = (amount * plan.interestRateBps * 30n) / (BASIS_POINTS * DAYS_PER_YEAR);

      const vaultFinal = await usdc.balanceOf(vault.target);
      expect(vaultFinal).to.equal(vaultInitial - interest);
    });

    it("should handle insufficient liquidity gracefully", async function () {
      const { savingBank, usdc, vault, admin, user1 } = await loadFixture(deployWithPlanFixture);

      // Create large deposit
      const amount = 50_000n * ONE_USDC;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, 30);

      // Admin withdraws most liquidity from vault
      const vaultBalance = await usdc.balanceOf(vault.target);
      await savingBank.withdrawFromVault(vaultBalance - 1000n * ONE_USDC);

      // Mature
      await advanceDays(31);

      // Withdraw should fail due to insufficient liquidity
      await expect(savingBank.connect(user1).withdraw(depositId)).to.be.reverted;
    });
  });

  describe("Multiple plans", function () {
    it("should allow deposits in different plans", async function () {
      const { savingBank, usdc, admin, user1 } = await loadFixture(deployWithPlanFixture);

      // Create premium plan
      await savingBank.createPlan(PREMIUM_PLAN);

      // Add liquidity
      await usdc.connect(admin).approve(savingBank.target, 500_000n * ONE_USDC);
      await savingBank.depositToVault(500_000n * ONE_USDC);

      // Deposit in standard plan
      const depositId1 = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      // Deposit in premium plan (higher minimum)
      await usdc.connect(user1).approve(savingBank.target, 10_000n * ONE_USDC);
      const tx = await savingBank.connect(user1).createDeposit(2, 10_000n * ONE_USDC, 90);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => log.fragment?.name === "DepositCreated");
      const depositId2 = event.args[0];

      // Verify different plans
      const deposit1 = await savingBank.getDeposit(depositId1);
      const deposit2 = await savingBank.getDeposit(depositId2);

      expect(deposit1.planId).to.equal(1n);
      expect(deposit2.planId).to.equal(2n);
    });

    it("should calculate interest based on plan's rate", async function () {
      const { savingBank, usdc, admin, user1 } = await loadFixture(deployWithPlanFixture);

      // Create premium plan with higher rate (16% = 2x default 8%)
      await savingBank.createPlan({
        ...PREMIUM_PLAN,
        interestRateBps: 1600n, // 16%
      });

      await usdc.connect(admin).approve(savingBank.target, 500_000n * ONE_USDC);
      await savingBank.depositToVault(500_000n * ONE_USDC);

      const amount = 10_000n * ONE_USDC;
      const termDays = 365;

      // Deposit in plan 1 (8% - DEFAULT_PLAN)
      const depositId1 = await createTestDeposit(savingBank, usdc, user1, amount, termDays);

      // Deposit in plan 2 (16%)
      await usdc.connect(user1).approve(savingBank.target, amount);
      await savingBank.connect(user1).createDeposit(2, amount, termDays);

      // Advance 1 year
      await advanceDays(366);

      // Withdraw from plan 1
      const balance1Before = await usdc.balanceOf(user1.address);
      await savingBank.connect(user1).withdraw(1);
      const balance1After = await usdc.balanceOf(user1.address);
      const received1 = balance1After - balance1Before;

      // Withdraw from plan 2
      const balance2Before = await usdc.balanceOf(user1.address);
      await savingBank.connect(user1).withdraw(2);
      const balance2After = await usdc.balanceOf(user1.address);
      const received2 = balance2After - balance2Before;

      // Plan 2 should give more interest
      expect(received2).to.be.gt(received1);

      // Approximate check: plan2 interest should be ~2x plan1 interest
      const interest1 = received1 - amount;
      const interest2 = received2 - amount;
      expect(interest2).to.be.closeTo(interest1 * 2n, ONE_USDC);
    });
  });

  describe("Admin operations", function () {
    it("should allow admin to pause and unpause", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);

      // Pause
      await savingBank.pause();

      // User cannot create deposit
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 30)).to.be.revertedWithCustomError(
        savingBank,
        "EnforcedPause"
      );

      // Unpause
      await savingBank.unpause();

      // User can create deposit
      await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 30);
    });

    it("should only allow admin to manage plans", async function () {
      const { savingBank, user1 } = await loadFixture(deployWithPlanFixture);

      // User cannot create plan
      await expect(savingBank.connect(user1).createPlan(PREMIUM_PLAN)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );

      // User cannot update plan
      await expect(savingBank.connect(user1).updatePlan(1, PREMIUM_PLAN)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );

      // User cannot deactivate plan
      await expect(savingBank.connect(user1).setPlanActive(1, false)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );
    });

    it("should only allow admin to manage vault", async function () {
      const { savingBank, usdc, admin, user1 } = await loadFixture(deployWithPlanFixture);

      // Give user1 some USDC
      await usdc.connect(admin).transfer(user1.address, 10_000n * ONE_USDC);
      await usdc.connect(user1).approve(savingBank.target, 10_000n * ONE_USDC);

      // User cannot deposit to vault
      await expect(savingBank.connect(user1).depositToVault(1000n * ONE_USDC)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );

      // User cannot withdraw from vault
      await expect(savingBank.connect(user1).withdrawFromVault(1000n * ONE_USDC)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );
    });
  });

  describe("Edge cases", function () {
    it("should handle minimum deposit amount", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const plan = await savingBank.getPlan(1);

      await usdc.connect(user1).approve(savingBank.target, plan.minAmount);
      await savingBank.connect(user1).createDeposit(1, plan.minAmount, plan.minTermDays);
    });

    it("should handle maximum deposit amount", async function () {
      const { savingBank, usdc, admin, user1 } = await loadFixture(deployWithPlanFixture);

      const plan = await savingBank.getPlan(1);

      // maxAmount = 0 means no limit, use a large amount instead
      const depositAmount = plan.maxAmount > 0n ? plan.maxAmount : 50_000n * ONE_USDC;

      // Give user enough USDC
      await usdc.connect(admin).transfer(user1.address, depositAmount);

      await usdc.connect(user1).approve(savingBank.target, depositAmount);
      await savingBank.connect(user1).createDeposit(1, depositAmount, plan.minTermDays);
    });

    it("should handle minimum term days", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const plan = await savingBank.getPlan(1);

      await usdc.connect(user1).approve(savingBank.target, plan.minAmount);
      await savingBank.connect(user1).createDeposit(1, plan.minAmount, plan.minTermDays);
    });

    it("should handle maximum term days", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const plan = await savingBank.getPlan(1);

      await usdc.connect(user1).approve(savingBank.target, plan.minAmount);
      await savingBank.connect(user1).createDeposit(1, plan.minAmount, plan.maxTermDays);
    });

    it("should handle renew at exact maturity time", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      // Advance to exact maturity
      const deposit = await savingBank.getDeposit(depositId);
      await advanceToTimestamp(deposit.maturityTime);

      // Should be able to renew
      await savingBank.connect(user1).renew(depositId, 1, 60);
    });
  });
});
