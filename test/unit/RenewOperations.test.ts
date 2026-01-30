import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployWithPlanFixture } from "../helpers/fixtures";
import { advanceDays, advanceToTimestamp } from "../helpers/time";
import { ONE_USDC, BASIS_POINTS, DAYS_PER_YEAR, PREMIUM_PLAN } from "../helpers/constants";

describe("Renew Operations", function () {
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

  describe("renew - Success", function () {
    it("should renew deposit after maturity with compound interest", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const amount = 10_000n * ONE_USDC;
      const termDays = 90;
      const depositId = await createTestDeposit(savingBank, usdc, user1, amount, termDays);

      // Calculate expected interest
      const plan = await savingBank.getPlan(1);
      const expectedInterest = (amount * plan.interestRateBps * BigInt(termDays)) / (BASIS_POINTS * DAYS_PER_YEAR);
      const newAmount = amount + expectedInterest;

      // Advance to maturity
      const deposit = await savingBank.getDeposit(depositId);
      await advanceToTimestamp(deposit.maturityTime);

      // Renew
      const newTermDays = 60;
      await expect(savingBank.connect(user1).renew(depositId, 1, newTermDays))
        .to.emit(savingBank, "Renewed")
        .withArgs(depositId, 2n, newAmount);

      // Check new deposit
      const newDeposit = await savingBank.getDeposit(2);
      expect(newDeposit.amount).to.equal(newAmount);
      expect(newDeposit.termDays).to.equal(newTermDays);
      expect(newDeposit.isClosed).to.be.false;

      // Old deposit should be closed
      const oldDeposit = await savingBank.getDeposit(depositId);
      expect(oldDeposit.isClosed).to.be.true;
    });

    it("should burn old NFT and mint new NFT", async function () {
      const { savingBank, usdc, certificate, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);

      // Renew
      await savingBank.connect(user1).renew(depositId, 1, 60);

      // Old NFT burned
      await expect(certificate.ownerOf(depositId)).to.be.revertedWithCustomError(certificate, "ERC721NonexistentToken");

      // New NFT minted
      expect(await certificate.ownerOf(2)).to.equal(user1.address);
    });

    it("should emit both Renewed and DepositCreated events", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);
      await advanceDays(31);

      const tx = await savingBank.connect(user1).renew(depositId, 1, 60);
      const receipt = await tx.wait();

      const renewedEvent = receipt.logs.find((log: any) => log.fragment?.name === "Renewed");
      const depositCreatedEvent = receipt.logs.find((log: any) => log.fragment?.name === "DepositCreated");

      expect(renewedEvent).to.not.be.undefined;
      expect(depositCreatedEvent).to.not.be.undefined;
    });
  });

  describe("renew - To different plan", function () {
    it("should renew to different plan", async function () {
      const { savingBank, usdc, admin, user1 } = await loadFixture(deployWithPlanFixture);

      // Create premium plan
      await savingBank.createPlan(PREMIUM_PLAN);

      // Add more liquidity for premium plan interest
      await usdc.connect(admin).approve(savingBank.target, 500_000n * ONE_USDC);
      await savingBank.depositToVault(500_000n * ONE_USDC);

      // Create deposit in plan 1
      const depositId = await createTestDeposit(savingBank, usdc, user1, 5000n * ONE_USDC, 30);

      await advanceDays(31);

      // Renew to plan 2 (premium)
      await savingBank.connect(user1).renew(depositId, 2, 90);

      const newDeposit = await savingBank.getDeposit(2);
      expect(newDeposit.planId).to.equal(2n);
    });

    it("should validate new amount against new plan limits", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      // Create plan with high minAmount
      await savingBank.createPlan({
        ...PREMIUM_PLAN,
        minAmount: 50_000n * ONE_USDC, // Very high minimum
      });

      // Create small deposit
      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);

      // Renew to plan with high minimum should fail
      await expect(savingBank.connect(user1).renew(depositId, 2, 90)).to.be.revertedWithCustomError(
        savingBank,
        "InvalidAmount"
      );
    });

    it("should validate new term against new plan limits", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      // Create plan with longer min term
      await savingBank.createPlan({
        ...PREMIUM_PLAN,
        minTermDays: 180,
      });

      const depositId = await createTestDeposit(savingBank, usdc, user1, 5000n * ONE_USDC, 30);

      await advanceDays(31);

      // Renew with term shorter than new plan's minimum
      await expect(savingBank.connect(user1).renew(depositId, 2, 60)).to.be.revertedWithCustomError(
        savingBank,
        "InvalidTerm"
      );
    });
  });

  describe("renew - Validation", function () {
    it("should reject when deposit not found", async function () {
      const { savingBank, user1 } = await loadFixture(deployWithPlanFixture);

      await expect(savingBank.connect(user1).renew(99, 1, 60)).to.be.revertedWithCustomError(
        savingBank,
        "DepositNotFound"
      );
    });

    it("should reject when deposit already closed", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);
      await savingBank.connect(user1).withdraw(depositId);

      // Try to renew closed deposit
      await expect(savingBank.connect(user1).renew(depositId, 1, 60)).to.be.revertedWithCustomError(
        savingBank,
        "DepositClosed"
      );
    });

    it("should reject when not matured yet", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 90);

      // Only advance 30 days (not matured)
      await advanceDays(30);

      await expect(savingBank.connect(user1).renew(depositId, 1, 60)).to.be.revertedWithCustomError(
        savingBank,
        "DepositNotMature"
      );
    });

    it("should reject when not NFT owner", async function () {
      const { savingBank, usdc, user1, user2 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);

      // user2 tries to renew user1's deposit
      await expect(savingBank.connect(user2).renew(depositId, 1, 60)).to.be.revertedWithCustomError(
        savingBank,
        "NotOwner"
      );
    });

    it("should reject when new plan not found", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);

      await expect(savingBank.connect(user1).renew(depositId, 99, 60)).to.be.revertedWithCustomError(
        savingBank,
        "PlanNotFound"
      );
    });

    it("should reject when new plan inactive", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      // Create and deactivate plan 2
      await savingBank.createPlan(PREMIUM_PLAN);
      await savingBank.setPlanActive(2, false);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 5000n * ONE_USDC, 30);

      await advanceDays(31);

      await expect(savingBank.connect(user1).renew(depositId, 2, 90)).to.be.revertedWithCustomError(
        savingBank,
        "PlanNotActive"
      );
    });

    it("should reject when paused", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      await advanceDays(31);
      await savingBank.pause();

      await expect(savingBank.connect(user1).renew(depositId, 1, 60)).to.be.revertedWithCustomError(
        savingBank,
        "EnforcedPause"
      );
    });
  });

  describe("NFT Transfer then renew", function () {
    it("should allow new owner to renew after NFT transfer", async function () {
      const { savingBank, usdc, certificate, user1, user2 } = await loadFixture(deployWithPlanFixture);

      const depositId = await createTestDeposit(savingBank, usdc, user1, 1000n * ONE_USDC, 30);

      // Transfer NFT
      await certificate.connect(user1).transferFrom(user1.address, user2.address, depositId);

      await advanceDays(31);

      // user1 cannot renew
      await expect(savingBank.connect(user1).renew(depositId, 1, 60)).to.be.revertedWithCustomError(
        savingBank,
        "NotOwner"
      );

      // user2 can renew
      await savingBank.connect(user2).renew(depositId, 1, 60);

      // New NFT belongs to user2
      expect(await certificate.ownerOf(2)).to.equal(user2.address);
    });
  });
});
