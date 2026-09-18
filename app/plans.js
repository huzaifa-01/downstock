// DownStock has exactly one paid plan — no free tier, no tiers to compare.
// Kept as its own file (rather than inlined) so it mirrors the other
// MatrixInn apps' structure and stays the single place price/trial live.
export const PLAN = {
  key: "downstock",
  label: "DownStock",
  amount: 1.99,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS",
  trialDays: 14,
};
