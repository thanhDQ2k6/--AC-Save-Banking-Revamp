/**
 * 08-error-cases.ts - Test error/validation cases
 *
 * Usage: npx hardhat run scripts/manual-tests/08-error-cases.ts --network localhost
 */
import { ONE_USDC, getContracts, getSigners, logHeader, logSuccess, logInfo, logError, formatUSDC } from "./shared";

async function main() {
  logHeader("STEP 8: ERROR CASES");

  const { usdc, savingBank } = await getContracts();
  const { user1, user2 } = await getSigners();

  // ============================================================
  // TEST: Invalid Plan
  // ============================================================
  console.log("\n🚫 Testing invalid plan...");
  try {
    await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
    await savingBank.connect(user1).createDeposit(99, 1000n * ONE_USDC, 60);
    logError(`❌ FAIL: Should reject invalid plan ID`);
  } catch (e: any) {
    if (e.message.includes("PlanNotFound")) {
      logSuccess(`✅ PASS: Rejected - PlanNotFound`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // ============================================================
  // TEST: Amount below minimum
  // ============================================================
  console.log("\n🚫 Testing amount below minimum...");
  try {
    await usdc.connect(user1).approve(savingBank.target, 10n * ONE_USDC);
    await savingBank.connect(user1).createDeposit(1, 10n * ONE_USDC, 60); // min = 100 USDC
    logError(`❌ FAIL: Should reject amount below minimum`);
  } catch (e: any) {
    if (e.message.includes("InvalidAmount")) {
      logSuccess(`✅ PASS: Rejected - InvalidAmount (below minimum)`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // ============================================================
  // TEST: Term below minimum
  // ============================================================
  console.log("\n🚫 Testing term below minimum...");
  try {
    await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
    await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 10); // min = 30 days
    logError(`❌ FAIL: Should reject term below minimum`);
  } catch (e: any) {
    if (e.message.includes("InvalidTerm")) {
      logSuccess(`✅ PASS: Rejected - InvalidTerm (below minimum)`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // ============================================================
  // TEST: Term above maximum
  // ============================================================
  console.log("\n🚫 Testing term above maximum...");
  try {
    await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
    await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 500); // max = 365 days
    logError(`❌ FAIL: Should reject term above maximum`);
  } catch (e: any) {
    if (e.message.includes("InvalidTerm")) {
      logSuccess(`✅ PASS: Rejected - InvalidTerm (above maximum)`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // ============================================================
  // TEST: Withdraw non-existent deposit
  // ============================================================
  console.log("\n🚫 Testing withdraw non-existent deposit...");
  try {
    await savingBank.connect(user1).withdraw(9999);
    logError(`❌ FAIL: Should reject non-existent deposit`);
  } catch (e: any) {
    if (e.message.includes("DepositNotFound")) {
      logSuccess(`✅ PASS: Rejected - DepositNotFound`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // ============================================================
  // TEST: Cannot withdraw twice
  // ============================================================
  console.log("\n🚫 Testing cannot withdraw twice...");

  // Create a deposit
  await usdc.connect(user1).approve(savingBank.target, 500n * ONE_USDC);
  const tx = await savingBank.connect(user1).createDeposit(1, 500n * ONE_USDC, 30);
  const receipt = await tx.wait();

  const event = receipt?.logs.find((log: any) => {
    try {
      return savingBank.interface.parseLog(log)?.name === "DepositCreated";
    } catch {
      return false;
    }
  });
  const depositId = savingBank.interface.parseLog(event!)?.args.depositId;
  logInfo(`Created deposit #${depositId}`);

  // First withdraw
  await savingBank.connect(user1).withdraw(depositId);
  logInfo(`First withdraw successful`);

  // Second withdraw (should fail)
  try {
    await savingBank.connect(user1).withdraw(depositId);
    logError(`❌ FAIL: Should not be able to withdraw twice`);
  } catch (e: any) {
    if (e.message.includes("DepositClosed")) {
      logSuccess(`✅ PASS: Rejected - DepositClosed`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // ============================================================
  // TEST: Insufficient allowance
  // ============================================================
  console.log("\n🚫 Testing insufficient allowance...");
  try {
    // No approval
    await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 60);
    logError(`❌ FAIL: Should reject without approval`);
  } catch (e: any) {
    if (e.message.includes("ERC20InsufficientAllowance")) {
      logSuccess(`✅ PASS: Rejected - ERC20InsufficientAllowance`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  logHeader("ERROR CASES TEST COMPLETE ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
