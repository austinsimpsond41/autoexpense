import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient, UserRole } from "@prisma/client";
import { env } from "@/env";
import { headers } from "next/headers";
import { db } from "@/server/db";

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	url: env.BETTER_AUTH_URL,
	database: prismaAdapter(db, {
		provider: "postgresql",
	}),
	socialProviders: {
		microsoft: {
			clientId: env.MICROSOFT_CLIENT_ID,
			clientSecret: env.MICROSOFT_CLIENT_SECRET,
			tenantId: env.AZURE_TENANT_ID,
			authority: "https://login.microsoftonline.com",
			prompt: "select_account",
		},
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: true,
				defaultValue: UserRole.Normal,
				input: false,
			},
		},
	},
});

export async function getCurrentUser() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw new Error("not logged in");
	}

	return session.user;
}
