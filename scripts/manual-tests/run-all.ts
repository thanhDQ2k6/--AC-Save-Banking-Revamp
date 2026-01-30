/**
 * Run All Manual Tests
 * 
 * This script runs all manual tests in sequence.
 * 
 * Usage:
 * 1. Start local node: npx hardhat node --no-deploy
 * 2. Run: npx hardhat run scripts/manual-tests/run-all.ts --network localhost
 * 
 * Or use npm script: npm run test:manual
 */
import { execSync } from "child_process";
import path from "path";

const TESTS = [
  { name: "Deploy Contracts", file: "01-deploy.ts" },
  { name: "Create Deposits", file: "02-deposit.ts" },
  { name: "Early Withdraw", file: "03-withdraw-early.ts" },
  { name: "Matured Withdraw", file: "04-withdraw-matured.ts" },
  { name: "Renew Deposit", file: "05-renew.ts" },
  { name: "NFT Transfer", file: "06-nft-transfer.ts" },
  { name: "Admin Functions", file: "07-admin-functions.ts" },
  { name: "Error Cases", file: "08-error-cases.ts" },
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           RUNNING ALL MANUAL TESTS                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  const results: { name: string; success: boolean; error?: string }[] = [];
  const startTime = Date.now();

  for (const test of TESTS) {
    console.log(`\n🔄 Running: ${test.name}...`);
    console.log("-".repeat(60));

    try {
      const scriptPath = path.join(__dirname, test.file);
      execSync(`npx hardhat run ${scriptPath} --network localhost`, {
        stdio: "inherit",
        cwd: path.join(__dirname, "../.."),
      });
      results.push({ name: test.name, success: true });
    } catch (error: any) {
      results.push({ name: test.name, success: false, error: error.message });
      console.error(`\n❌ Test "${test.name}" failed!`);
      // Continue with other tests
    }
  }

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                    TEST SUMMARY                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  for (const result of results) {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${status}  ${result.name}`);
  }

  console.log();
  console.log("-".repeat(60));
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`  Duration: ${duration}s`);
  console.log("-".repeat(60));

  if (failed > 0) {
    console.log("\n⚠️  Some tests failed!");
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
  }
}

main().catch(console.error);
