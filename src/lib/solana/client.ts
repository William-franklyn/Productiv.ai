import "server-only";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";

// The SPL Memo program — well-known, deployed on every cluster including
// devnet. Writing to it just appends the instruction data as a UTF-8 memo
// to the transaction; no account state, nothing to own or rent.
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function getTreasuryKeypair(): Keypair | null {
  const secret = process.env.SOLANA_TREASURY_KEYPAIR;
  if (!secret) return null;
  try {
    return Keypair.fromSecretKey(bs58.decode(secret));
  } catch {
    return null;
  }
}

export function isSolanaConfigured() {
  return getTreasuryKeypair() !== null;
}

function getConnection(): Connection {
  const url = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  return new Connection(url, "confirmed");
}

export function getTreasuryAddress(): string | null {
  return getTreasuryKeypair()?.publicKey.toBase58() ?? null;
}

/**
 * Anchors one settlement batch on Solana devnet: a single memo transaction
 * naming the org, how many answered vs. refused, and the total lamport
 * cost — no member identity, no query content, ever. Returns the tx
 * signature to store back onto every usage_event in the batch.
 */
export async function settleBatch(params: {
  organizationId: string;
  answeredCount: number;
  refusedCount: number;
  totalLamports: number;
}): Promise<string> {
  const treasury = getTreasuryKeypair();
  if (!treasury) throw new Error("not_configured");

  const connection = getConnection();
  const memo = [
    "productivai-settle",
    params.organizationId,
    `answered=${params.answeredCount}`,
    `refused=${params.refusedCount}`,
    `lamports=${params.totalLamports}`,
    new Date().toISOString(),
  ].join(":");

  const instruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf-8"),
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = treasury.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.sign(treasury);

  const signature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

export function explorerUrl(txSig: string): string {
  return `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;
}
