// 0.5 SOL per 1,000 credits — the real conversion rate for sponsor funding.
// credit_balance itself is stored in credit units, not lamports; this is
// only used to translate a real devnet SOL transfer into credits at
// funding time.
export function lamportsPerCredit(): number {
  return Number(process.env.LAMPORTS_PER_CREDIT ?? 500_000);
}
