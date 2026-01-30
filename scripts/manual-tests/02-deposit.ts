/**
 * 02-deposit.ts - Test creating deposits
 *
 * Usage: npx hardhat run scripts/manual-tests/02-deposit.ts --network localhost
 */
import { ONE_USDC, getContracts, getSigners, logHeader, logSuccess, logInfo, formatUSDC } from "./shared";

async function main() {
  logHeader("STEP 2: CREATE DEPOSITS");

  const { usdc, certificate, savingBank } = await getContracts();
  const { user1, user2 } = await getSigners();

  // User1 creates deposit with Plan 1 (Standard)
  console.log("\n📝 User1 creating deposit...");
  const amount1 = 5_000n * ONE_USDC;
  const termDays1 = 60;

  const balBefore1 = await usdc.balanceOf(user1.address);
  logInfo(`User1 balance before: ${formatUSDC(balBefore1)}`);

  await usdc.connect(user1).approve(savingBank.target, amount1);
  const tx1 = await savingBank.connect(user1).createDeposit(1, amount1, termDays1);
  const receipt1 = await tx1.wait();

  const balAfter1 = await usdc.balanceOf(user1.address);
  logSuccess(`Deposit #1 created: ${formatUSDC(amount1)} for ${termDays1} days`);
  logInfo(`User1 balance after: ${formatUSDC(balAfter1)}`);

  // Check NFT minted
  const nftOwner1 = await certificate.ownerOf(1);
  logSuccess(`NFT #1 minted to: ${nftOwner1}`);

  // Check deposit details
  const deposit1 = await savingBank.getDeposit(1);
  logInfo(`Deposit #1 details:`);
  logInfo(`  - Amount: ${formatUSDC(deposit1.amount)}`);
  logInfo(`  - Term: ${deposit1.termDays} days`);
  logInfo(`  - Plan ID: ${deposit1.planId}`);
  logInfo(`  - Maturity: ${new Date(Number(deposit1.maturityTime) * 1000).toLocaleString()}`);

  // User2 creates deposit with Plan 2 (Premium)
  console.log("\n📝 User2 creating deposit...");
  const amount2 = 10_000n * ONE_USDC;
  const termDays2 = 180;

  await usdc.connect(user2).approve(savingBank.target, amount2);
  await savingBank.connect(user2).createDeposit(2, amount2, termDays2);

  logSuccess(`Deposit #2 created: ${formatUSDC(amount2)} for ${termDays2} days (Premium Plan)`);

  const nftOwner2 = await certificate.ownerOf(2);
  logSuccess(`NFT #2 minted to: ${nftOwner2}`);

  // Summary
  logHeader("DEPOSITS CREATED ✅");
  console.log("Deposit #1: User1, 5000 USDC, 60 days, Plan 1 (Standard)");
  console.log("Deposit #2: User2, 10000 USDC, 180 days, Plan 2 (Premium)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
