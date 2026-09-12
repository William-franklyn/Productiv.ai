import "server-only";

const VOYAGE_MODEL = "voyage-3.5";
export const EMBEDDING_DIMENSIONS = 1024;

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
}

async function callVoyage(input: string[], inputType: "document" | "query") {
  if (input.length === 0) return [];

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input,
      input_type: inputType,
      output_dimension: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    throw new Error(`Voyage embeddings request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as VoyageResponse;
  return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return callVoyage(texts, "document");
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await callVoyage([text], "query");
  return embedding;
}
