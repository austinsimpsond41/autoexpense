"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { UserRole, type Receipt } from "@prisma/client";

export async function getReceipts() {
	"use server";
	const user = await getCurrentUser();
	return await db.receipt.findMany({
		...(user.role === UserRole.Normal && {
			where: {
				expenseReport: {
					userId: user.id,
				},
			},
		}),
	});
}

export async function createReceipts(receipts: Array<Receipt>) {
	"use server";
	const user = await getCurrentUser();
	await db.receipt.createMany({
		data: receipts.map((x) => ({ ...x, metadata: x.metadata ?? undefined })),
	});
}

async function getOwnedReceipts(receiptIds: Array<string>, userId: string) {
	const ownedReports = await db.receipt.findMany({
		where: {
			id: {
				in: receiptIds,
			},
			expenseReport: {
				userId: userId,
			},
		},
		select: {
			id: true,
		},
	});

	return new Set(ownedReports.map((x) => x.id));
}

export async function updateReceipts(updates: Array<Receipt>) {
	"use server";
	const user = await getCurrentUser();

	const ownedReceiptIds = await getOwnedReceipts(
		updates.map((x) => x.id),
		user.id,
	);

	await db.$transaction(async (tx) => {
		for (const u of updates) {
			if (user.role !== UserRole.Reviewer && !ownedReceiptIds.has(u.id)) {
				continue;
			}

			await tx.receipt.update({
				where: { id: u.id },
				data: { ...(u as any), updatedAt: new Date() },
			});
		}
	});
}

export async function deleteReceipts(receiptIds: Array<string>) {
	"use server";
	const user = await getCurrentUser();

	const ownedReceiptIds = await getOwnedReceipts(receiptIds, user.id);

	await db.$transaction(async (tx) => {
		for (const id of receiptIds) {
			if (user.role !== UserRole.Reviewer && !ownedReceiptIds.has(id)) {
				continue;
			}

			await tx.receipt.delete({ where: { id } });
		}
	});
}
