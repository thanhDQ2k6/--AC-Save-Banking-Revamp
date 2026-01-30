/**
 * Post-Deploy Setup Script for Sepolia
 *
 * Usage: npx hardhat run scripts/sepolia/setup.ts --network sepolia
 *
 * This script:
 * 1. Creates saving plans
 * 2. Sets penalty receiver
 * 3. Mints test USDC (for testnet)
 * 4. Funds vault with liquidity
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ONE_USDC = 1_000_000n;

async function main() {
  console.log("=".repeat(60));
  console.log("POST-DEPLOY SETUP - SEPOLIA");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);

  // Read deployed addresses from hardhat-deploy
  const deploymentsPath = path.join(__dirname, "../../deployments/sepolia");

  const readDeployment = (name: string) => {
    const filePath = path.join(deploymentsPath, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Deployment not found: ${name}. Run 'npx hardhat deploy --network sepolia' first.`);
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  };

  const usdcDeployment = readDeployment("MockUSDC");
  const savingBankDeployment = readDeployment("SavingBank");
  const vaultDeployment = readDeployment("Vault");

  console.log("\nLoaded addresses:");
  console.log("  MockUSDC:", usdcDeployment.address);
  console.log("  SavingBank:", savingBankDeployment.address);
  console.log("  Vault:", vaultDeployment.address);

  // Get contracts
  const usdc = await ethers.getContractAt("MockUSDC", usdcDeployment.address);
  const savingBank = await ethers.getContractAt("SavingBank", savingBankDeployment.address);
  const vault = await ethers.getContractAt("Vault", vaultDeployment.address);

  // 1. Create Saving Plans
  console.log("\n📋 Creating saving plans...");

  // Check if plans already exist
  try {
    const plan1 = await savingBank.getPlan(1);
    if (plan1.id > 0) {
      console.log("  Plans already exist, skipping...");
    }
  } catch {
    // Plan 1: Standard (30-365 days, 8% APR, 5% penalty)
    let tx = await savingBank.createPlan({
      name: "Standard Plan",
      minAmount: 100n * ONE_USDC,
      maxAmount: 0n,
      minTermDays: 30,
      maxTermDays: 365,
      interestRateBps: 800,
      penaltyRateBps: 500,
    });
    await tx.wait();
    console.log("  ✅ Plan 1: Standard (8% APR, 5% penalty, 30-365 days)");

    // Plan 2: Premium (90-730 days, 12% APR, 3% penalty)
    tx = await savingBank.createPlan({
      name: "Premium Plan",
      minAmount: 1000n * ONE_USDC,
      maxAmount: 100_000n * ONE_USDC,
      minTermDays: 90,
      maxTermDays: 730,
      interestRateBps: 1200,
      penaltyRateBps: 300,
    });
    await tx.wait();
    console.log("  ✅ Plan 2: Premium (12% APR, 3% penalty, 90-730 days)");
  }

  // 2. Set penalty receiver
  console.log("\n💸 Setting penalty receiver...");
  const currentReceiver = await savingBank.penaltyReceiver();
  if (currentReceiver === ethers.ZeroAddress) {
    const tx = await savingBank.setPenaltyReceiver(deployer.address);
    await tx.wait();
    console.log("  ✅ Penalty receiver set to deployer");
  } else {
    console.log("  Already set:", currentReceiver);
  }

  // 3. Mint test USDC
  console.log("\n💵 Minting test USDC...");
  const deployerBalance = await usdc.balanceOf(deployer.address);
  if (deployerBalance < 100_000n * ONE_USDC) {
    const tx = await usdc.mint(deployer.address, 1_000_000n * ONE_USDC);
    await tx.wait();
    console.log("  ✅ Minted 1,000,000 USDC to deployer");
  } else {
    console.log("  Deployer already has:", Number(deployerBalance) / 1_000_000, "USDC");
  }

  // 4. Fund vault
  console.log("\n🏦 Funding vault...");
  const vaultBalance = await vault.getBalance();
  if (vaultBalance < 10_000n * ONE_USDC) {
    const fundAmount = 100_000n * ONE_USDC;
    const tx = await usdc.transfer(vaultDeployment.address, fundAmount);
    await tx.wait();
    console.log("  ✅ Transferred 100,000 USDC to vault");
  } else {
    console.log("  Vault already has:", Number(vaultBalance) / 1_000_000, "USDC");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SETUP COMPLETE");
  console.log("=".repeat(60));

  const finalVaultBal = await vault.getBalance();
  const finalDeployerBal = await usdc.balanceOf(deployer.address);

  console.log("Vault balance:", Number(finalVaultBal) / 1_000_000, "USDC");
  console.log("Deployer balance:", Number(finalDeployerBal) / 1_000_000, "USDC");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
