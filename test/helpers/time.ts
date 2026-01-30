import { time } from "@nomicfoundation/hardhat-network-helpers";

export async function advanceDays(days: number): Promise<void> {
  await time.increase(days * 24 * 60 * 60);
}

export async function advanceToTimestamp(timestamp: bigint): Promise<void> {
  await time.increaseTo(timestamp);
}

export async function getTimestamp(): Promise<bigint> {
  return BigInt(await time.latest());
}
