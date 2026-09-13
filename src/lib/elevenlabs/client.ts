import "server-only";

const BASE_URL = "https://api.elevenlabs.io/v1";

// "Rachel" — one of ElevenLabs' stock premade voices, used as a sane default
// so voice replies work out of the box without picking one first.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

function getKey() {
  return process.env.ELEVENLABS_API_KEY ?? null;
}

export function isElevenLabsConfigured() {
  return getKey() !== null;
}

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const key = getKey();
  if (!key) throw new Error("not_configured");

  const formData = new FormData();
  formData.append("model_id", "scribe_v1");
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), "audio.webm");

  const res = await fetch(`${BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": key },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs speech-to-text error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { text: string };
  return data.text;
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const key = getKey();
  if (!key) throw new Error("not_configured");

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs text-to-speech error (${res.status}): ${body.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}
