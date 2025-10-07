/**
 * src/lib/ai.ts
 *
 * Configure the Vercel AI SDK to use Azure OpenAI.
 * Uses the exported `env` object from `src/env.js`.
 */

import { createAzure } from "@ai-sdk/azure"
import { env } from "../env";

const azure = createAzure({
	apiKey: env.AZURE_OPENAI_KEY,
	resourceName: env.AZURE_OPENAI_RESOURCE,
});

export const ai = azure(env.AZURE_OPENAI_DEPLOYMENT_NAME)
