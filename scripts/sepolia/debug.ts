/**
 * Debug script - Check contract state and do detailed early withdraw test
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ONE_USDC = 1_000_000n;

async function main() {
  console.log("=".repeat(60));
  console.log("DEBUG - EARLY WITHDRAW TEST WITH DETAILED LOGS");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nTester:", deployer.address);

  // Load contracts
  const deploymentsPath = path.join(__dirname, "../../deployments/sepolia");
  const readDeployment = (name: string) => {
    const filePath = path.join(deploymentsPath, `${name}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  };

  const usdc = await ethers.getContractAt("MockUSDC", readDeployment("MockUSDC").address);
  const vault = await ethers.getContractAt("Vault", readDeployment("Vault").address);
  const savingBank = await ethers.getContractAt("SavingBank", readDeployment("SavingBank").address);

  // Contract state
  const penaltyReceiver = await savingBank.penaltyReceiver();
  console.log("\n--- Contract State ---");
  console.log("Penalty Receiver:", penaltyReceiver);
  console.log("Is zero:", penaltyReceiver === ethers.ZeroAddress);

  const plan1 = await savingBank.getPlan(1);
  console.log("\nPlan 1:");
  console.log("  Penalty Rate:", plan1.penaltyRateBps.toString(), "bps =", Number(plan1.penaltyRateBps) / 100, "%");

  // Balances before
  console.log("\n--- Balances Before ---");
  const deployerBalBefore = await usdc.balanceOf(deployer.address);
  const penaltyReceiverBalBefore = await usdc.balanceOf(penaltyReceiver);
  const savingBankBalBefore = await usdc.balanceOf(await savingBank.getAddress());
  const vaultBalBefore = await vault.getBalance();

  console.log("Deployer:", Number(deployerBalBefore) / 1_000_000, "USDC");
  console.log("Penalty Receiver:", Number(penaltyReceiverBalBefore) / 1_000_000, "USDC");
  console.log("SavingBank:", Number(savingBankBalBefore) / 1_000_000, "USDC");
  console.log("Vault:", Number(vaultBalBefore) / 1_000_000, "USDC");

  // Create fresh deposit
  console.log("\n--- Creating Fresh Deposit ---");
  const depositAmount = 100n * ONE_USDC; // 100 USDC

  let tx = await usdc.approve(await savingBank.getAddress(), depositAmount);
  await tx.wait();

  tx = await savingBank.createDeposit(1, depositAmount, 30);
  const receipt = await tx.wait();

  let depositId: bigint = 0n;
  for (const log of receipt?.logs || []) {
    try {
      const parsed = savingBank.interface.parseLog(log as any);
      if (parsed?.name === "DepositCreated") {
        depositId = parsed.args.depositId;
        console.log("Created Deposit ID:", depositId.toString());
        console.log("  Amount:", Number(parsed.args.amount) / 1_000_000, "USDC");
        console.log("  Plan ID:", parsed.args.planId.toString());
        break;
      }
    } catch {}
  }

  // Verify deposit
  const deposit = await savingBank.getDeposit(depositId);
  console.log("\nDeposit details:");
  console.log("  Amount:", Number(deposit.amount) / 1_000_000, "USDC");
  console.log("  Plan ID:", deposit.planId.toString());
  console.log("  Is Closed:", deposit.isClosed);

  // Expected calculation
  const expectedPenalty = (BigInt(deposit.amount) * BigInt(plan1.penaltyRateBps)) / 10000n;
  const expectedPayout = BigInt(deposit.amount) - expectedPenalty;
  console.log("\n--- Expected ---");
  console.log("Penalty (5% of 100):", Number(expectedPenalty) / 1_000_000, "USDC");
  console.log("Payout to user:", Number(expectedPayout) / 1_000_000, "USDC");

  // Balances right before withdraw
  const deployerBalBeforeWithdraw = await usdc.balanceOf(deployer.address);
  const penaltyReceiverBalBeforeWithdraw = await usdc.balanceOf(penaltyReceiver);

  // Early withdraw
  console.log("\n--- Executing Early Withdraw ---");
  tx = await savingBank.withdraw(depositId);
  const withdrawReceipt = await tx.wait();
  console.log("Tx Hash:", withdrawReceipt?.hash);

  // Parse Withdrawn event
  for (const log of withdrawReceipt?.logs || []) {
    try {
      const parsed = savingBank.interface.parseLog(log as any);
      if (parsed?.name === "Withdrawn") {
        console.log("\nWithdrawn Event:");
        console.log("  Deposit ID:", parsed.args.depositId.toString());
        console.log("  User:", parsed.args.user);
        console.log("  Payout:", Number(parsed.args.payout) / 1_000_000, "USDC");
        console.log("  Interest:", Number(parsed.args.interest) / 1_000_000, "USDC");
        console.log("  Penalty:", Number(parsed.args.penalty) / 1_000_000, "USDC");
        console.log("  Is Early:", parsed.args.early);
        break;
      }
    } catch {}
  }

  // Balances after
  console.log("\n--- Balances After ---");
  const deployerBalAfter = await usdc.balanceOf(deployer.address);
  const penaltyReceiverBalAfter = await usdc.balanceOf(penaltyReceiver);
  const savingBankBalAfter = await usdc.balanceOf(await savingBank.getAddress());
  const vaultBalAfter = await vault.getBalance();

  console.log("Deployer:", Number(deployerBalAfter) / 1_000_000, "USDC");
  console.log("Penalty Receiver:", Number(penaltyReceiverBalAfter) / 1_000_000, "USDC");
  console.log("SavingBank:", Number(savingBankBalAfter) / 1_000_000, "USDC");
  console.log("Vault:", Number(vaultBalAfter) / 1_000_000, "USDC");

  // Changes
  console.log("\n--- Changes ---");
  const deployerChange = deployerBalAfter - deployerBalBeforeWithdraw;
  const penaltyReceiverChange = penaltyReceiverBalAfter - penaltyReceiverBalBeforeWithdraw;

  console.log("Deployer received:", Number(deployerChange) / 1_000_000, "USDC");
  console.log("Penalty Receiver received:", Number(penaltyReceiverChange) / 1_000_000, "USDC");

  // Verify
  console.log("\n--- Verification ---");
  if (deployerChange === expectedPayout) {
    console.log("✅ User received correct payout");
  } else {
    console.log("❌ User received WRONG amount!");
    console.log("   Expected:", Number(expectedPayout) / 1_000_000, "USDC");
    console.log("   Got:", Number(deployerChange) / 1_000_000, "USDC");
  }

  if (penaltyReceiverChange === expectedPenalty) {
    console.log("✅ Penalty Receiver received correct penalty");
  } else {
    console.log("❌ Penalty Receiver received WRONG amount!");
    console.log("   Expected:", Number(expectedPenalty) / 1_000_000, "USDC");
    console.log("   Got:", Number(penaltyReceiverChange) / 1_000_000, "USDC");
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
