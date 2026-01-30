/**
 * 07-admin-functions.ts - Test admin functions (pause, plans, penalty receiver)
 *
 * Usage: npx hardhat run scripts/manual-tests/07-admin-functions.ts --network localhost
 */
import { ONE_USDC, getContracts, getSigners, logHeader, logSuccess, logInfo, logError, formatUSDC } from "./shared";

async function main() {
  logHeader("STEP 7: ADMIN FUNCTIONS");

  const { usdc, savingBank } = await getContracts();
  const { admin, user1, user2 } = await getSigners();

  // ============================================================
  // TEST: Pause/Unpause
  // ============================================================
  console.log("\n⏸️  Testing Pause/Unpause...");

  // Admin pauses
  await savingBank.connect(admin).pause();
  logSuccess(`Contract paused by admin`);

  // User tries to deposit while paused
  try {
    await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
    await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 30);
    logError(`❌ FAIL: Should not be able to deposit when paused`);
  } catch (e: any) {
    if (e.message.includes("EnforcedPause")) {
      logSuccess(`✅ PASS: Deposit rejected - EnforcedPause`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // Admin unpauses
  await savingBank.connect(admin).unpause();
  logSuccess(`Contract unpaused by admin`);

  // User can deposit again
  await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
  await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 30);
  logSuccess(`✅ PASS: Can deposit after unpause`);

  // Non-admin tries to pause (should fail)
  console.log("\n🚫 Non-admin trying to pause...");
  try {
    await savingBank.connect(user1).pause();
    logError(`❌ FAIL: Non-admin should not be able to pause`);
  } catch (e: any) {
    if (e.message.includes("NotAdmin")) {
      logSuccess(`✅ PASS: Non-admin rejected - NotAdmin`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // ============================================================
  // TEST: Change Penalty Receiver
  // ============================================================
  console.log("\n💸 Testing Penalty Receiver...");

  const oldPenaltyReceiver = await savingBank.penaltyReceiver();
  logInfo(`Current penalty receiver: ${oldPenaltyReceiver}`);

  // Change penalty receiver to user2
  await savingBank.connect(admin).setPenaltyReceiver(user2.address);
  logSuccess(`Penalty receiver changed to User2`);

  const newPenaltyReceiver = await savingBank.penaltyReceiver();
  if (newPenaltyReceiver === user2.address) {
    logSuccess(`✅ PASS: Penalty receiver is now User2`);
  } else {
    logError(`❌ FAIL: Expected ${user2.address}, got ${newPenaltyReceiver}`);
  }

  // Create deposit and early withdraw to test penalty goes to new receiver
  const user2BalBefore = await usdc.balanceOf(user2.address);

  await usdc.connect(user1).approve(savingBank.target, 2000n * ONE_USDC);
  const tx = await savingBank.connect(user1).createDeposit(1, 2000n * ONE_USDC, 60);
  const receipt = await tx.wait();

  const event = receipt?.logs.find((log: any) => {
    try {
      return savingBank.interface.parseLog(log)?.name === "DepositCreated";
    } catch {
      return false;
    }
  });
  const depositId = savingBank.interface.parseLog(event!)?.args.depositId;

  await savingBank.connect(user1).withdraw(depositId);

  const user2BalAfter = await usdc.balanceOf(user2.address);
  const penaltyReceived = user2BalAfter - user2BalBefore;

  // 2000 * 5% = 100 USDC penalty
  const expectedPenalty = 100n * ONE_USDC;
  logInfo(`User2 received: ${formatUSDC(penaltyReceived)} (penalty)`);

  if (penaltyReceived === expectedPenalty) {
    logSuccess(`✅ PASS: Penalty sent to new receiver`);
  } else {
    logError(`❌ FAIL: Expected ${formatUSDC(expectedPenalty)}, got ${formatUSDC(penaltyReceived)}`);
  }

  // ============================================================
  // TEST: Deactivate Plan
  // ============================================================
  console.log("\n📋 Testing Plan Deactivation...");

  // Check plan 1 is active
  const plan1Before = await savingBank.getPlan(1);
  logInfo(`Plan 1 isActive before: ${plan1Before.isActive}`);

  // Deactivate plan 1
  await savingBank.connect(admin).setPlanActive(1, false);
  logSuccess(`Plan 1 deactivated`);

  const plan1After = await savingBank.getPlan(1);
  if (!plan1After.isActive) {
    logSuccess(`✅ PASS: Plan 1 is now inactive`);
  } else {
    logError(`❌ FAIL: Plan 1 should be inactive`);
  }

  // Try to create deposit with inactive plan
  try {
    await usdc.connect(user1).approve(savingBank.target, 1000n * ONE_USDC);
    await savingBank.connect(user1).createDeposit(1, 1000n * ONE_USDC, 30);
    logError(`❌ FAIL: Should not be able to deposit with inactive plan`);
  } catch (e: any) {
    if (e.message.includes("PlanNotActive")) {
      logSuccess(`✅ PASS: Deposit rejected - PlanNotActive`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // Reactivate plan 1
  await savingBank.connect(admin).setPlanActive(1, true);
  logSuccess(`Plan 1 reactivated`);

  logHeader("ADMIN FUNCTIONS TEST COMPLETE ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
