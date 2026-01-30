/**
 * 06-nft-transfer.ts - Test NFT transfer and withdraw by new owner
 *
 * Usage: npx hardhat run scripts/manual-tests/06-nft-transfer.ts --network localhost
 */
import { ONE_USDC, getContracts, getSigners, logHeader, logSuccess, logInfo, logError, formatUSDC } from "./shared";

async function main() {
  logHeader("STEP 6: NFT TRANSFER & WITHDRAW");

  const { usdc, certificate, savingBank } = await getContracts();
  const { user1, user2 } = await getSigners();

  // User1 creates a deposit
  console.log("\n📝 User1 creating deposit...");
  const amount = 3_000n * ONE_USDC;
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
  logSuccess(`Deposit #${depositId} created by User1`);

  // Check initial NFT owner
  let nftOwner = await certificate.ownerOf(depositId);
  logInfo(`NFT owner before transfer: ${nftOwner}`);

  // User1 transfers NFT to User2
  console.log("\n🔄 User1 transferring NFT to User2...");
  await certificate.connect(user1).transferFrom(user1.address, user2.address, depositId);

  nftOwner = await certificate.ownerOf(depositId);
  logSuccess(`NFT #${depositId} transferred to User2`);
  logInfo(`NFT owner after transfer: ${nftOwner}`);

  if (nftOwner === user2.address) {
    logSuccess(`✅ PASS: NFT now owned by User2`);
  } else {
    logError(`❌ FAIL: Expected owner ${user2.address}, got ${nftOwner}`);
  }

  // User1 tries to withdraw (should fail)
  console.log("\n🚫 User1 trying to withdraw (should fail)...");
  try {
    await savingBank.connect(user1).withdraw(depositId);
    logError(`❌ FAIL: User1 should not be able to withdraw`);
  } catch (e: any) {
    if (e.message.includes("NotOwner")) {
      logSuccess(`✅ PASS: User1 rejected - NotOwner`);
    } else {
      logError(`❌ FAIL: Unexpected error: ${e.message}`);
    }
  }

  // User2 withdraws (should succeed)
  console.log("\n💰 User2 withdrawing (new NFT owner)...");
  const user2BalBefore = await usdc.balanceOf(user2.address);
  logInfo(`User2 balance before: ${formatUSDC(user2BalBefore)}`);

  await savingBank.connect(user2).withdraw(depositId);

  const user2BalAfter = await usdc.balanceOf(user2.address);
  const received = user2BalAfter - user2BalBefore;

  // Early withdraw: amount - 5% penalty
  const expectedPenalty = (amount * 500n) / 10000n;
  const expectedReceived = amount - expectedPenalty;

  logSuccess(`User2 withdrew successfully!`);
  logInfo(`User2 balance after: ${formatUSDC(user2BalAfter)}`);
  logInfo(`Amount received: ${formatUSDC(received)}`);
  logInfo(`Expected (early withdraw): ${formatUSDC(expectedReceived)}`);

  if (received === expectedReceived) {
    logSuccess(`✅ PASS: User2 received correct amount`);
  } else {
    logError(`❌ FAIL: Expected ${formatUSDC(expectedReceived)}, got ${formatUSDC(received)}`);
  }

  // Verify NFT is burned
  try {
    await certificate.ownerOf(depositId);
    logError(`❌ FAIL: NFT should be burned`);
  } catch {
    logSuccess(`✅ PASS: NFT #${depositId} is burned`);
  }

  logHeader("NFT TRANSFER TEST COMPLETE ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
