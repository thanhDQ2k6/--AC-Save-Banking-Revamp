/**
 * 05-renew.ts - Test renew deposit (compound interest)
 *
 * Usage: npx hardhat run scripts/manual-tests/05-renew.ts --network localhost
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
  logHeader("STEP 5: RENEW DEPOSIT (COMPOUND)");

  const { usdc, certificate, savingBank } = await getContracts();
  const { user1 } = await getSigners();

  // Create a new deposit
  console.log("\n📝 Creating deposit for renew test...");
  const amount = 5_000n * ONE_USDC;
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
  const oldDepositId = savingBank.interface.parseLog(event!)?.args.depositId;
  logSuccess(`Deposit #${oldDepositId} created: ${formatUSDC(amount)} for ${termDays} days`);

  // Get deposit details
  const oldDeposit = await savingBank.getDeposit(oldDepositId);
  logInfo(`Original deposit amount: ${formatUSDC(oldDeposit.amount)}`);

  // Advance time past maturity
  console.log("\n⏰ Advancing time past maturity...");
  await ethers.provider.send("evm_increaseTime", [termDays * ONE_DAY + 1]);
  await ethers.provider.send("evm_mine", []);
  logSuccess(`Time advanced ${termDays} days + 1 second`);

  // Renew to new term
  console.log("\n🔄 Renewing deposit...");
  const newTermDays = 60;
  const newPlanId = 1; // Same plan

  const renewTx = await savingBank.connect(user1).renew(oldDepositId, newPlanId, newTermDays);
  const renewReceipt = await renewTx.wait();

  // Get new deposit ID from event - use return value instead
  // renew returns newDepositId, so we can check next deposit
  const nextDepositId = oldDepositId + 1n;
  logSuccess(`Renewed! Old #${oldDepositId} -> New #${nextDepositId}`);
  const newDepositId = nextDepositId;

  // Calculate expected new amount (principal + interest)
  const expectedInterest = (amount * 800n * BigInt(termDays)) / (10000n * 365n);
  const expectedNewAmount = amount + expectedInterest;

  // Check new deposit
  const newDeposit = await savingBank.getDeposit(newDepositId);
  logInfo(`New deposit details:`);
  logInfo(`  - ID: ${newDeposit.id}`);
  logInfo(`  - Amount: ${formatUSDC(newDeposit.amount)}`);
  logInfo(`  - Expected amount: ${formatUSDC(expectedNewAmount)}`);
  logInfo(`  - Term: ${newDeposit.termDays} days`);
  logInfo(`  - Plan ID: ${newDeposit.planId}`);

  if (newDeposit.amount === expectedNewAmount) {
    logSuccess(`✅ PASS: New amount = principal + interest (compounded)`);
  } else {
    logError(`❌ FAIL: Expected ${formatUSDC(expectedNewAmount)}, got ${formatUSDC(newDeposit.amount)}`);
  }

  if (Number(newDeposit.termDays) === newTermDays) {
    logSuccess(`✅ PASS: New term = ${newTermDays} days`);
  } else {
    logError(`❌ FAIL: Expected term ${newTermDays}, got ${newDeposit.termDays}`);
  }

  // Check old deposit is closed
  const oldDepositAfter = await savingBank.getDeposit(oldDepositId);
  if (oldDepositAfter.isClosed) {
    logSuccess(`✅ PASS: Old deposit #${oldDepositId} is closed`);
  } else {
    logError(`❌ FAIL: Old deposit should be closed`);
  }

  // Check old NFT is burned
  try {
    await certificate.ownerOf(oldDepositId);
    logError(`❌ FAIL: Old NFT should be burned`);
  } catch {
    logSuccess(`✅ PASS: Old NFT #${oldDepositId} is burned`);
  }

  // Check new NFT is minted to user
  const newNftOwner = await certificate.ownerOf(newDepositId);
  if (newNftOwner === user1.address) {
    logSuccess(`✅ PASS: New NFT #${newDepositId} minted to user`);
  } else {
    logError(`❌ FAIL: New NFT owner is ${newNftOwner}`);
  }

  logHeader("RENEW TEST COMPLETE ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
