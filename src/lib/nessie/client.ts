import "server-only";

const BASE_URL = "http://api.nessieisreal.com";

function getKey() {
  return process.env.NESSIE_API_KEY ?? null;
}

async function nessieFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getKey();
  if (!key) throw new Error("not_configured");

  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE_URL}${path}${separator}key=${key}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Nessie API error (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export function isNessieConfigured() {
  return getKey() !== null;
}

interface NessieAccount {
  _id: string;
  type: string;
  nickname: string;
  rewards: number;
  balance: number;
  customer_id: string;
}

interface NessieCustomer {
  _id: string;
}

interface NessieMerchant {
  _id: string;
  name: string;
}

interface NessieTransactionRaw {
  _id: string;
  amount: number;
  description?: string;
  status?: string;
  transaction_date?: string;
  purchase_date?: string;
  medium?: string;
  merchant_id?: string;
}

// Every workspace's demo account lives under one shared sandbox customer —
// Nessie has no concept of a business/org, just individual customers, so
// this is a placeholder identity, not a real person.
export async function createDemoCustomer(orgName: string) {
  const customer = await nessieFetch<{ objectCreated: NessieCustomer }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      first_name: orgName.slice(0, 40) || "Workspace",
      last_name: "Demo Account",
      address: {
        street_number: "1",
        street_name: "Market St",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
      },
    }),
  });
  return customer.objectCreated._id;
}

export async function createDemoAccount(customerId: string, nickname: string, startingBalance: number) {
  const account = await nessieFetch<{ objectCreated: NessieAccount }>(
    `/customers/${customerId}/accounts`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "Checking",
        nickname,
        rewards: 0,
        balance: startingBalance,
      }),
    },
  );
  return account.objectCreated._id;
}

export async function getAccount(accountId: string): Promise<NessieAccount> {
  return nessieFetch<NessieAccount>(`/accounts/${accountId}`);
}

export interface Transaction {
  id: string;
  type: "purchase" | "transfer" | "deposit" | "withdrawal";
  amount: number;
  description: string;
  date: string;
}

// Nessie splits transaction history across four separate endpoints by
// type — there's no unified ledger — so this merges and sorts them into one
// list, newest first, the way a real statement would read.
export async function listTransactions(accountId: string): Promise<Transaction[]> {
  const [purchases, transfers, deposits, withdrawals] = await Promise.all([
    nessieFetch<NessieTransactionRaw[]>(`/accounts/${accountId}/purchases`).catch(() => []),
    nessieFetch<NessieTransactionRaw[]>(`/accounts/${accountId}/transfers`).catch(() => []),
    nessieFetch<NessieTransactionRaw[]>(`/accounts/${accountId}/deposits`).catch(() => []),
    nessieFetch<NessieTransactionRaw[]>(`/accounts/${accountId}/withdrawals`).catch(() => []),
  ]);

  const toTx = (type: Transaction["type"]) => (t: NessieTransactionRaw): Transaction => ({
    id: t._id,
    type,
    amount: type === "purchase" || type === "withdrawal" ? -Math.abs(t.amount) : Math.abs(t.amount),
    description: t.description || (type === "purchase" ? "Purchase" : type),
    date: t.purchase_date || t.transaction_date || new Date().toISOString(),
  });

  const all = [
    ...purchases.map(toTx("purchase")),
    ...transfers.map(toTx("transfer")),
    ...deposits.map(toTx("deposit")),
    ...withdrawals.map(toTx("withdrawal")),
  ];

  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function findOrCreateMerchant(name: string): Promise<string> {
  const merchants = await nessieFetch<NessieMerchant[]>("/merchants");
  const existing = merchants.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing._id;

  const created = await nessieFetch<{ objectCreated: NessieMerchant }>("/merchants", {
    method: "POST",
    body: JSON.stringify({
      name,
      category: "vendor",
      address: {
        street_number: "1",
        street_name: "Market St",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
      },
      geocode: { lat: 37.7749, lng: -122.4194 },
    }),
  });
  return created.objectCreated._id;
}

export async function createPurchase(params: {
  accountId: string;
  vendorName: string;
  amount: number;
  description?: string;
}): Promise<string> {
  const merchantId = await findOrCreateMerchant(params.vendorName);
  const purchase = await nessieFetch<{ objectCreated: { _id: string } }>(
    `/accounts/${params.accountId}/purchases`,
    {
      method: "POST",
      body: JSON.stringify({
        merchant_id: merchantId,
        medium: "balance",
        purchase_date: new Date().toISOString().slice(0, 10),
        amount: params.amount,
        description: params.description || params.vendorName,
        status: "completed",
      }),
    },
  );
  return purchase.objectCreated._id;
}
