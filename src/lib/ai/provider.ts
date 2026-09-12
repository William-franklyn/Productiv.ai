import { anthropic } from "@ai-sdk/anthropic";

// Every assistant call goes through this one place so the model id only
// needs to change in one spot.
export const chatModel = anthropic("claude-sonnet-5");
