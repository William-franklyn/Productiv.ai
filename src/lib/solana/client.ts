import "server-only";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
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
 * A fresh devnet public key for an org to receive sponsor funding into.
 * Receive-only by design — sponsor credit can never be spent outward, so
 * there's no reason to ever sign with it, which is why only the public key
 * gets stored anywhere.
 */
export function createReceiveOnlyWallet(): string {
  return Keypair.generate().publicKey.toBase58();
}

/**
 * The actual funding movement: a real devnet SOL transfer from the platform
 * treasury (the hackathon-scope stand-in for a sponsor's own wallet — see
 * docs/sponsored-credits.md) to the org's receive-only address. Returns the
 * tx signature.
 */
export async function transferSol(params: { toAddress: string; lamports: number }): Promise<string> {
  const treasury = getTreasuryKeypair();
  if (!treasury) throw new Error("not_configured");

  const connection = getConnection();
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: new PublicKey(params.toAddress),
      lamports: params.lamports,
    }),
  );
  transaction.feePayer = treasury.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.sign(treasury);

  const signature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

/**
 * Anchors one settlement batch on Solana devnet: a single memo transaction
 * naming the org, how many of each action/outcome, and the total credits —
 * no member identity, no query content, ever. Returns the tx signature to
 * store back onto every usage_event in the batch.
 */
export async function settleBatch(params: {
  organizationId: string;
  counts: Record<string, number>;
  totalCredits: number;
}): Promise<string> {
  const treasury = getTreasuryKeypair();
  if (!treasury) throw new Error("not_configured");

  const connection = getConnection();
  const countsPart = Object.entries(params.counts)
    .map(([key, n]) => `${key}=${n}`)
    .join(",");
  const memo = [
    "productivai-settle",
    params.organizationId,
    countsPart,
    `credits=${params.totalCredits}`,
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
