import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFixture } from "../helpers/fixtures";
import { ONE_USDC, DEFAULT_PLAN, PREMIUM_PLAN } from "../helpers/constants";

describe("SavingPlan Management", function () {
  describe("createPlan", function () {
    it("should allow admin to create plan", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      await expect(savingBank.createPlan(DEFAULT_PLAN))
        .to.emit(savingBank, "PlanCreated")
        .withArgs(1n, DEFAULT_PLAN.name);

      const plan = await savingBank.getPlan(1);
      expect(plan.name).to.equal(DEFAULT_PLAN.name);
      expect(plan.minAmount).to.equal(DEFAULT_PLAN.minAmount);
      expect(plan.interestRateBps).to.equal(DEFAULT_PLAN.interestRateBps);
      expect(plan.isActive).to.be.true;
    });

    it("should reject when not admin", async function () {
      const { savingBank, user1 } = await loadFixture(deployFixture);

      await expect(savingBank.connect(user1).createPlan(DEFAULT_PLAN)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );
    });

    it("should reject when minTermDays = 0", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      const invalidPlan = { ...DEFAULT_PLAN, minTermDays: 0 };
      await expect(savingBank.createPlan(invalidPlan)).to.be.revertedWithCustomError(savingBank, "InvalidPlan");
    });

    it("should reject when maxTermDays <= minTermDays", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      const invalidPlan = { ...DEFAULT_PLAN, minTermDays: 30, maxTermDays: 30 };
      await expect(savingBank.createPlan(invalidPlan)).to.be.revertedWithCustomError(savingBank, "InvalidPlan");
    });

    it("should reject when interestRateBps = 0", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      const invalidPlan = { ...DEFAULT_PLAN, interestRateBps: 0n };
      await expect(savingBank.createPlan(invalidPlan)).to.be.revertedWithCustomError(savingBank, "InvalidPlan");
    });

    it("should reject when penaltyRateBps > 10000", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      const invalidPlan = { ...DEFAULT_PLAN, penaltyRateBps: 10001n };
      await expect(savingBank.createPlan(invalidPlan)).to.be.revertedWithCustomError(savingBank, "InvalidPlan");
    });
  });

  describe("updatePlan", function () {
    it("should allow admin to update plan", async function () {
      const { savingBank } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);

      const updatedPlan = { ...DEFAULT_PLAN, name: "Updated Plan", interestRateBps: 1000n };
      await expect(savingBank.updatePlan(1, updatedPlan)).to.emit(savingBank, "PlanUpdated").withArgs(1n);

      const plan = await savingBank.getPlan(1);
      expect(plan.name).to.equal("Updated Plan");
      expect(plan.interestRateBps).to.equal(1000n);
    });

    it("should reject when plan not found", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      await expect(savingBank.updatePlan(99, DEFAULT_PLAN)).to.be.revertedWithCustomError(savingBank, "PlanNotFound");
    });

    it("should reject when not admin", async function () {
      const { savingBank, user1 } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);

      await expect(savingBank.connect(user1).updatePlan(1, DEFAULT_PLAN)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );
    });
  });

  describe("setPlanActive", function () {
    it("should allow admin to deactivate plan", async function () {
      const { savingBank } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);

      await expect(savingBank.setPlanActive(1, false)).to.emit(savingBank, "PlanActiveChanged").withArgs(1n, false);

      const plan = await savingBank.getPlan(1);
      expect(plan.isActive).to.be.false;
    });

    it("should allow admin to reactivate plan", async function () {
      const { savingBank } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);
      await savingBank.setPlanActive(1, false);

      await savingBank.setPlanActive(1, true);
      const plan = await savingBank.getPlan(1);
      expect(plan.isActive).to.be.true;
    });

    it("should reject deposit when plan inactive", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);
      await savingBank.setPlanActive(1, false);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 60)).to.be.revertedWithCustomError(
        savingBank,
        "PlanNotActive"
      );
    });

    it("should not affect existing deposits when plan deactivated", async function () {
      const { savingBank, usdc, vault, admin, user1 } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);

      // Admin nạp liquidity
      await usdc.connect(admin).approve(savingBank.target, 100_000n * ONE_USDC);
      await savingBank.depositToVault(100_000n * ONE_USDC);

      // User deposit
      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 60);

      // Deactivate plan
      await savingBank.setPlanActive(1, false);

      // Deposit vẫn tồn tại
      const deposit = await savingBank.getDeposit(1);
      expect(deposit.amount).to.equal(1000n * ONE_USDC);
      expect(deposit.isClosed).to.be.false;
    });
  });

  describe("Multiple plans", function () {
    it("should create multiple plans with different IDs", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      await savingBank.createPlan(DEFAULT_PLAN);
      await savingBank.createPlan(PREMIUM_PLAN);

      const plan1 = await savingBank.getPlan(1);
      const plan2 = await savingBank.getPlan(2);

      expect(plan1.id).to.equal(1n);
      expect(plan1.name).to.equal(DEFAULT_PLAN.name);
      expect(plan2.id).to.equal(2n);
      expect(plan2.name).to.equal(PREMIUM_PLAN.name);
    });
  });
});
