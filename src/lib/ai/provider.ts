import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// @ai-sdk/google defaults to reading GOOGLE_GENERATIVE_AI_API_KEY — using
// our own GEMINI_API_KEY name instead, for consistency with every other
// provider key in this codebase (PERSONA_API_KEY, BACKBOARD_API_KEY, ...).
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// Every assistant call goes through this one place so the model id only
// needs to change in one spot.
export const chatModel = anthropic("claude-sonnet-5");

// Multimodal fallback for scanned/image-only PDFs a text-layer extractor
// can't read — see src/lib/knowledge/extract.ts. gemini-2.5-flash returned
// 404 "no longer available to new users" as of this build; verified
// gemini-3.6-flash directly against the API before using it here.
export const geminiModel = google("gemini-3.6-flash");
