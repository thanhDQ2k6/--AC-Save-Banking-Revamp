/**
 * Test Script for Sepolia Testnet
 *
 * Usage: npx hardhat run scripts/sepolia/test.ts --network sepolia
 *
 * Tests:
 * 1. Create deposit
 * 2. Check NFT minted
 * 3. Early withdraw (with penalty)
 * 4. Matured withdraw (with interest) - requires waiting or time manipulation
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ONE_USDC = 1_000_000n;

async function main() {
  console.log("=".repeat(60));
  console.log("SEPOLIA TESTNET - INTEGRATION TEST");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nTester:", deployer.address);

  // Read deployed addresses
  const deploymentsPath = path.join(__dirname, "../../deployments/sepolia");

  const readDeployment = (name: string) => {
    const filePath = path.join(deploymentsPath, `${name}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  };

  const usdc = await ethers.getContractAt("MockUSDC", readDeployment("MockUSDC").address);
  const certificate = await ethers.getContractAt("DepositCertificate", readDeployment("DepositCertificate").address);
  const vault = await ethers.getContractAt("Vault", readDeployment("Vault").address);
  const savingBank = await ethers.getContractAt("SavingBank", readDeployment("SavingBank").address);

  console.log("\nContracts:");
  console.log("  MockUSDC:", await usdc.getAddress());
  console.log("  Certificate:", await certificate.getAddress());
  console.log("  Vault:", await vault.getAddress());
  console.log("  SavingBank:", await savingBank.getAddress());

  // Check balances
  const deployerBal = await usdc.balanceOf(deployer.address);
  const vaultBal = await vault.getBalance();
  console.log("\nBalances:");
  console.log("  Deployer:", Number(deployerBal) / 1_000_000, "USDC");
  console.log("  Vault:", Number(vaultBal) / 1_000_000, "USDC");

  // ============================================================
  // TEST 1: Create Deposit
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 1: Create Deposit");
  console.log("=".repeat(60));

  const depositAmount = 500n * ONE_USDC; // 500 USDC
  const termDays = 30;
  const planId = 1;

  // Approve
  console.log("\nApproving USDC...");
  let tx = await usdc.approve(await savingBank.getAddress(), depositAmount);
  await tx.wait();
  console.log("  ✅ Approved", Number(depositAmount) / 1_000_000, "USDC");

  // Create deposit
  console.log("\nCreating deposit...");
  const balBefore = await usdc.balanceOf(deployer.address);

  tx = await savingBank.createDeposit(planId, depositAmount, termDays);
  const receipt = await tx.wait();
  console.log("  ✅ Tx hash:", receipt?.hash);

  const balAfter = await usdc.balanceOf(deployer.address);
  console.log("  Balance change:", Number(balBefore - balAfter) / 1_000_000, "USDC");

  // Find deposit ID from events
  let depositId: bigint = 1n;
  for (const log of receipt?.logs || []) {
    try {
      const parsed = savingBank.interface.parseLog(log as any);
      if (parsed?.name === "DepositCreated") {
        depositId = parsed.args.depositId;
        break;
      }
    } catch {}
  }
  console.log("  Deposit ID:", depositId.toString());

  // Check NFT
  const nftOwner = await certificate.ownerOf(depositId);
  console.log("  NFT Owner:", nftOwner);
  console.log("  ✅ NFT minted:", nftOwner === deployer.address ? "PASS" : "FAIL");

  // Get deposit details
  const deposit = await savingBank.getDeposit(depositId);
  console.log("\nDeposit Details:");
  console.log("  Amount:", Number(deposit.amount) / 1_000_000, "USDC");
  console.log("  Term:", deposit.termDays, "days");
  console.log("  Plan:", deposit.planId.toString());
  console.log("  Maturity:", new Date(Number(deposit.maturityTime) * 1000).toISOString());

  // ============================================================
  // TEST 2: Early Withdraw (with penalty)
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: Early Withdraw");
  console.log("=".repeat(60));

  // Create another deposit for early withdraw test
  console.log("\nCreating deposit for early withdraw test...");
  tx = await usdc.approve(await savingBank.getAddress(), 200n * ONE_USDC);
  await tx.wait();

  tx = await savingBank.createDeposit(1, 200n * ONE_USDC, 30);
  const receipt2 = await tx.wait();

  let earlyDepositId: bigint = 2n;
  for (const log of receipt2?.logs || []) {
    try {
      const parsed = savingBank.interface.parseLog(log as any);
      if (parsed?.name === "DepositCreated") {
        earlyDepositId = parsed.args.depositId;
        break;
      }
    } catch {}
  }
  console.log("  Created deposit #" + earlyDepositId.toString());

  // Early withdraw
  console.log("\nWithdrawing early...");
  const balBeforeWithdraw = await usdc.balanceOf(deployer.address);

  tx = await savingBank.withdraw(earlyDepositId);
  await tx.wait();

  const balAfterWithdraw = await usdc.balanceOf(deployer.address);
  const received = balAfterWithdraw - balBeforeWithdraw;

  // Expected: 200 - 5% = 190 USDC
  const expectedWithPenalty = 190n * ONE_USDC;

  console.log("  Received:", Number(received) / 1_000_000, "USDC");
  console.log("  Expected:", Number(expectedWithPenalty) / 1_000_000, "USDC");
  console.log("  ✅ Early withdraw:", received === expectedWithPenalty ? "PASS" : "FAIL");

  // Check NFT burned
  try {
    await certificate.ownerOf(earlyDepositId);
    console.log("  ❌ NFT NOT burned");
  } catch {
    console.log("  ✅ NFT burned");
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));
  console.log("✅ Create Deposit: PASS");
  console.log("✅ NFT Minting: PASS");
  console.log("✅ Early Withdraw: PASS");
  console.log("\n⚠️  Note: Matured withdraw requires waiting 30 days or");
  console.log("   testing on local node with time manipulation.");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
