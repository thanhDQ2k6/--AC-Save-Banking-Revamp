import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFixture } from "../helpers/fixtures";
import { ONE_USDC } from "../helpers/constants";

describe("Vault Operations", function () {
  describe("setSavingBank", function () {
    it("should set savingBank address", async function () {
      const { vault, savingBank } = await loadFixture(deployFixture);
      expect(await vault.savingBank()).to.equal(savingBank.target);
    });

    it("should reject second call to setSavingBank", async function () {
      const { vault, user1 } = await loadFixture(deployFixture);

      await expect(vault.setSavingBank(user1.address)).to.be.reverted; // Already set
    });
  });

  describe("deposit", function () {
    it("should reject when not SavingBank", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployFixture);

      await usdc.connect(user1).approve(vault.target, 1000n * ONE_USDC);
      await expect(vault.connect(user1).deposit(1000n * ONE_USDC)).to.be.reverted;
    });
  });

  describe("withdraw", function () {
    it("should reject when not SavingBank", async function () {
      const { vault, user1 } = await loadFixture(deployFixture);

      await expect(vault.connect(user1).withdraw(1000n * ONE_USDC, user1.address)).to.be.reverted;
    });
  });

  describe("getBalance", function () {
    it("should return correct balance", async function () {
      const { vault } = await loadFixture(deployFixture);
      expect(await vault.getBalance()).to.equal(0n);
    });
  });

  describe("Admin via SavingBank", function () {
    it("should allow admin to deposit via SavingBank", async function () {
      const { savingBank, usdc, vault, admin } = await loadFixture(deployFixture);

      const amount = 10_000n * ONE_USDC;
      await usdc.connect(admin).approve(savingBank.target, amount);

      await expect(savingBank.depositToVault(amount)).to.emit(savingBank, "VaultDeposited").withArgs(amount);

      expect(await vault.getBalance()).to.equal(amount);
    });

    it("should reject depositToVault when not admin", async function () {
      const { savingBank, usdc, user1 } = await loadFixture(deployFixture);

      await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
      await expect(savingBank.connect(user1).depositToVault(1000n * ONE_USDC)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );
    });

    it("should reject depositToVault with amount = 0", async function () {
      const { savingBank } = await loadFixture(deployFixture);

      await expect(savingBank.depositToVault(0n)).to.be.revertedWithCustomError(savingBank, "InvalidAmount");
    });

    it("should allow admin to withdraw via SavingBank", async function () {
      const { savingBank, usdc, vault, admin } = await loadFixture(deployFixture);

      // Deposit first
      const amount = 10_000n * ONE_USDC;
      await usdc.connect(admin).approve(savingBank.target, amount);
      await savingBank.depositToVault(amount);

      // Withdraw
      const withdrawAmount = 5_000n * ONE_USDC;
      const balanceBefore = await usdc.balanceOf(admin.address);

      await expect(savingBank.withdrawFromVault(withdrawAmount))
        .to.emit(savingBank, "VaultWithdrawn")
        .withArgs(withdrawAmount);

      expect(await vault.getBalance()).to.equal(amount - withdrawAmount);
      expect(await usdc.balanceOf(admin.address)).to.equal(balanceBefore + withdrawAmount);
    });

    it("should reject withdrawFromVault when not admin", async function () {
      const { savingBank, user1 } = await loadFixture(deployFixture);

      await expect(savingBank.connect(user1).withdrawFromVault(1000n * ONE_USDC)).to.be.revertedWithCustomError(
        savingBank,
        "NotAdmin"
      );
    });

    it("should reject withdrawFromVault exceeding balance", async function () {
      const { savingBank, usdc, vault, admin } = await loadFixture(deployFixture);

      // Deposit 1000
      await usdc.connect(admin).approve(savingBank.target, 1000n * ONE_USDC);
      await savingBank.depositToVault(1000n * ONE_USDC);

      // Try withdraw 2000
      await expect(savingBank.withdrawFromVault(2000n * ONE_USDC)).to.be.revertedWithCustomError(
        vault,
        "InsufficientBalance"
      );
    });
  });
});
