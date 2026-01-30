/**
 * 03-withdraw-early.ts - Test early withdraw (with penalty)
 *
 * Usage: npx hardhat run scripts/manual-tests/03-withdraw-early.ts --network localhost
 */
import { ethers } from "hardhat";
import { ONE_USDC, getContracts, getSigners, logHeader, logSuccess, logInfo, logError, formatUSDC } from "./shared";

async function main() {
  logHeader("STEP 3: EARLY WITHDRAW (PENALTY)");

  const { usdc, certificate, savingBank } = await getContracts();
  const { admin, user1 } = await getSigners();

  // Create a new deposit for testing early withdraw
  console.log("\n📝 Creating deposit for early withdraw test...");
  const amount = 2_000n * ONE_USDC;
  const termDays = 90;

  await usdc.connect(user1).approve(savingBank.target, amount);
  const tx = await savingBank.connect(user1).createDeposit(1, amount, termDays);
  const receipt = await tx.wait();

  // Get deposit ID from event
  const event = receipt?.logs.find((log: any) => {
    try {
      return savingBank.interface.parseLog(log)?.name === "DepositCreated";
    } catch {
      return false;
    }
  });
  const depositId = savingBank.interface.parseLog(event!)?.args.depositId;
  logSuccess(`Deposit #${depositId} created: ${formatUSDC(amount)} for ${termDays} days`);

  // Check penalty receiver balance before
  const penaltyReceiver = await savingBank.penaltyReceiver();
  const penaltyReceiverBalBefore = await usdc.balanceOf(penaltyReceiver);
  logInfo(`Penalty receiver: ${penaltyReceiver}`);
  logInfo(`Penalty receiver balance before: ${formatUSDC(penaltyReceiverBalBefore)}`);

  // Early withdraw (deposit is not mature yet)
  console.log("\n💸 Withdrawing early (before maturity)...");
  const userBalBefore = await usdc.balanceOf(user1.address);
  logInfo(`User1 balance before: ${formatUSDC(userBalBefore)}`);

  await savingBank.connect(user1).withdraw(depositId);

  const userBalAfter = await usdc.balanceOf(user1.address);
  const received = userBalAfter - userBalBefore;

  // Calculate expected: amount - 5% penalty = 2000 - 100 = 1900
  const expectedPenalty = (amount * 500n) / 10000n; // 5%
  const expectedReceived = amount - expectedPenalty;

  logSuccess(`Withdrawn!`);
  logInfo(`User1 balance after: ${formatUSDC(userBalAfter)}`);
  logInfo(`Amount received: ${formatUSDC(received)}`);
  logInfo(`Expected (amount - 5% penalty): ${formatUSDC(expectedReceived)}`);

  if (received === expectedReceived) {
    logSuccess(`✅ PASS: Received correct amount after penalty`);
  } else {
    logError(`❌ FAIL: Expected ${formatUSDC(expectedReceived)}, got ${formatUSDC(received)}`);
  }

  // Check penalty was sent to penalty receiver
  const penaltyReceiverBalAfter = await usdc.balanceOf(penaltyReceiver);
  const penaltyReceived = penaltyReceiverBalAfter - penaltyReceiverBalBefore;

  logInfo(`Penalty receiver balance after: ${formatUSDC(penaltyReceiverBalAfter)}`);
  logInfo(`Penalty received: ${formatUSDC(penaltyReceived)}`);

  if (penaltyReceived === expectedPenalty) {
    logSuccess(`✅ PASS: Penalty receiver got correct amount`);
  } else {
    logError(`❌ FAIL: Expected penalty ${formatUSDC(expectedPenalty)}, got ${formatUSDC(penaltyReceived)}`);
  }

  // Check deposit is closed
  const deposit = await savingBank.getDeposit(depositId);
  if (deposit.isClosed) {
    logSuccess(`✅ PASS: Deposit #${depositId} is closed`);
  } else {
    logError(`❌ FAIL: Deposit should be closed`);
  }

  // Check NFT is burned
  try {
    await certificate.ownerOf(depositId);
    logError(`❌ FAIL: NFT should be burned`);
  } catch {
    logSuccess(`✅ PASS: NFT #${depositId} is burned`);
  }

  logHeader("EARLY WITHDRAW TEST COMPLETE ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
