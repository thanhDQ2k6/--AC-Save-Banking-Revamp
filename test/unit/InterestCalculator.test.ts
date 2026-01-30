import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ONE_USDC, BASIS_POINTS, DAYS_PER_YEAR, DEFAULT_PLAN } from "../helpers/constants";
import { deployFixture } from "../helpers/fixtures";

describe("InterestCalculator", function () {
  describe("calculateSimpleInterest (via SavingBank.calculateInterest)", function () {
    it("should calculate interest correctly for standard case", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      // Create plan first
      await savingBank.createPlan(DEFAULT_PLAN);

      // 1000 USDC, 8% APR, 90 days
      const principal = 1000n * ONE_USDC;
      const termDays = 90;

      // Expected: 1000 * 800 * 90 / (10000 * 365) = 19.726... USDC
      const expected = (principal * 800n * BigInt(termDays)) / (BASIS_POINTS * DAYS_PER_YEAR);
      const result = await savingBank.calculateInterest(principal, 1, termDays);

      expect(result).to.equal(expected);
    });

    it("should calculate interest for 1 year term", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      // Create plan with 10% rate
      await savingBank.createPlan({
        ...DEFAULT_PLAN,
        interestRateBps: 1000n, // 10%
      });

      // 10000 USDC, 10% APR, 365 days
      const principal = 10000n * ONE_USDC;
      const termDays = 365;

      const result = await savingBank.calculateInterest(principal, 1, termDays);

      expect(result).to.equal(1000n * ONE_USDC);
    });

    it("should handle large amounts without overflow", async function () {
      const { savingBank } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);

      const principal = 1_000_000_000n * ONE_USDC; // 1 billion
      const termDays = 365;

      // Should not throw
      await savingBank.calculateInterest(principal, 1, termDays);
    });

    it("should revert for 0 principal", async function () {
      const { savingBank } = await loadFixture(deployFixture);
      await savingBank.createPlan(DEFAULT_PLAN);

      await expect(savingBank.calculateInterest(0n, 1, 90)).to.be.revertedWith("Principal must be positive");
    });
  });

  describe("calculatePenalty (tested via withdraw)", function () {
    it("penalty calculation is tested in WithdrawOperations.test.ts", async function () {
      // Penalty is calculated internally during early withdrawal
      // See WithdrawOperations.test.ts for penalty tests
      expect(true).to.be.true;
    });
  });
});
