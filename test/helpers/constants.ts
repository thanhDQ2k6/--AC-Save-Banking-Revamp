export const BASIS_POINTS = 10000n;
export const SECONDS_PER_DAY = 86400n;
export const DAYS_PER_YEAR = 365n;

export const USDC_DECIMALS = 6;
export const ONE_USDC = 10n ** BigInt(USDC_DECIMALS);

// Default plan input cho tests
export const DEFAULT_PLAN = {
  name: "Default Plan",
  minAmount: 100n * ONE_USDC,
  maxAmount: 0n, // no limit
  minTermDays: 30,
  maxTermDays: 365,
  interestRateBps: 800n, // 8%
  penaltyRateBps: 500n, // 5%
};

// Premium plan input
export const PREMIUM_PLAN = {
  name: "Premium Plan",
  minAmount: 1000n * ONE_USDC,
  maxAmount: 100_000n * ONE_USDC,
  minTermDays: 90,
  maxTermDays: 730,
  interestRateBps: 1200n, // 12%
  penaltyRateBps: 300n, // 3%
};
