export function lamportsPerAnswer(): number {
  return Number(process.env.LAMPORTS_PER_ANSWER ?? 1000);
}

// $1 funds ~10 answers — a simple, demo-friendly conversion. These are
// virtual accounting units, not real lamports; the exact scale only has to
// stay consistent with lamportsPerAnswer().
export function lamportsPerDollar(): number {
  return lamportsPerAnswer() * 10;
}
