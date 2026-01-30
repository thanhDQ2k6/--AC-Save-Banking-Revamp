/**
 * 04-withdraw-matured.ts - Test matured withdraw (with interest)
 *
 * Usage: npx hardhat run scripts/manual-tests/04-withdraw-matured.ts --network localhost
 */
import { ethers } from "hardhat";
import {
  ONE_USDC,
  ONE_DAY,
  getContracts,
  getSigners,
  logHeader,
  logSuccess,
  logInfo,
  logError,
  formatUSDC,
} from "./shared";

async function main() {
  logHeader("STEP 4: MATURED WITHDRAW (INTEREST)");

  const { usdc, certificate, savingBank } = await getContracts();
  const { user1 } = await getSigners();

  // Create a new deposit
  console.log("\n📝 Creating deposit for matured withdraw test...");
  const amount = 10_000n * ONE_USDC;
  const termDays = 30;

  await usdc.connect(user1).approve(savingBank.target, amount);
  const tx = await savingBank.connect(user1).createDeposit(1, amount, termDays);
  const receipt = await tx.wait();

  const event = receipt?.logs.find((log: any) => {
    try {
      return savingBank.interface.parseLog(log)?.name === "DepositCreated";
    } catch {
      return false;
    }
  });
  const depositId = savingBank.interface.parseLog(event!)?.args.depositId;
  logSuccess(`Deposit #${depositId} created: ${formatUSDC(amount)} for ${termDays} days`);

  // Advance time past maturity
  console.log("\n⏰ Advancing time past maturity...");
  await ethers.provider.send("evm_increaseTime", [termDays * ONE_DAY + 1]);
  await ethers.provider.send("evm_mine", []);
  logSuccess(`Time advanced ${termDays} days + 1 second`);

  // Withdraw after maturity
  console.log("\n💰 Withdrawing after maturity...");
  const userBalBefore = await usdc.balanceOf(user1.address);
  logInfo(`User1 balance before: ${formatUSDC(userBalBefore)}`);

  await savingBank.connect(user1).withdraw(depositId);

  const userBalAfter = await usdc.balanceOf(user1.address);
  const received = userBalAfter - userBalBefore;

  // Calculate expected interest: amount * 8% * termDays / 365
  // 10000 * 0.08 * 30 / 365 = 65.75 USDC
  const expectedInterest = (amount * 800n * BigInt(termDays)) / (10000n * 365n);
  const expectedTotal = amount + expectedInterest;

  logSuccess(`Withdrawn!`);
  logInfo(`User1 balance after: ${formatUSDC(userBalAfter)}`);
  logInfo(`Amount received: ${formatUSDC(received)}`);
  logInfo(`Expected principal: ${formatUSDC(amount)}`);
  logInfo(`Expected interest (8% APR for ${termDays} days): ${formatUSDC(expectedInterest)}`);
  logInfo(`Expected total: ${formatUSDC(expectedTotal)}`);

  if (received === expectedTotal) {
    logSuccess(`✅ PASS: Received correct amount with interest`);
  } else {
    logError(`❌ FAIL: Expected ${formatUSDC(expectedTotal)}, got ${formatUSDC(received)}`);
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

  logHeader("MATURED WITHDRAW TEST COMPLETE ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
