"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { UserRole, type Merchant } from "@prisma/client";

export async function getMerchants() {
	"use server";
	return await db.merchant.findMany();
}

export async function createMerchants(merchants: Array<Merchant>) {
	"use server";
	await db.merchant.createMany({
		data: merchants.map((x) => ({
			...x,
			normalizedName: x.name.toUpperCase(),
		})),
	});
}

export async function updateMerchants(updates: Array<Merchant>) {
	"use server";
	await db.$transaction(async (tx) => {
		for (const u of updates) {
			await tx.merchant.update({
				where: { id: u.id },
				data: { ...u, updatedAt: new Date() },
			});
		}
	});
}

export async function deleteMerchants(merchantIds: Array<string>) {
	"use server";
	await db.$transaction(async (tx) => {
		for (const id of merchantIds) {
			await tx.merchant.delete({ where: { id } });
		}
	});
}
