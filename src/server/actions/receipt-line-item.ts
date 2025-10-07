"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { UserRole, type ReceiptLineItem } from "@prisma/client";

export async function getReceiptLineItems() {
	"use server";
	const user = await getCurrentUser();
	return (await db.receiptLineItem.findMany({
		...(user.role === UserRole.Normal && {
			where: {
				receipt: {
					expenseReport: {
						userId: user.id,
					},
				},
			},
		}),
	}))
}

export async function createReceiptLineItems(items: Array<ReceiptLineItem>) {
	"use server";
	const user = await getCurrentUser();

	const receiptIds = Array.from(new Set(items.map((x) => x.receiptId)));
	const ownedReceipts = await db.receipt.findMany({
		where: {
			id: {
				in: receiptIds,
			},
			expenseReport: {
				userId: user.id,
			},
		},
		select: {
			id: true,
		},
	});
	const ownedReceiptIds = new Set(ownedReceipts.map((r) => r.id));

	await db.receiptLineItem.createMany({
		data: items
			.filter((i) => {
				// reviewers can create on any receipt; normal users only on owned receipts
				if (user.role === UserRole.Reviewer) return true;
				return ownedReceiptIds.has(i.receiptId);
			})
			.map((x) => ({
				...x,
				sku: x.sku ?? undefined,
				currency: x.currency ?? undefined,
			})),
	});
}

async function getOwnedLineItems(lineItemIds: Array<string>, userId: string) {
	const owned = await db.receiptLineItem.findMany({
		where: {
			id: {
				in: lineItemIds,
			},
			receipt: {
				expenseReport: {
					userId,
				},
			},
		},
		select: {
			id: true,
		},
	});

	return new Set(owned.map((x) => x.id));
}

export async function updateReceiptLineItems(updates: Array<ReceiptLineItem>) {
	"use server";
	const user = await getCurrentUser();

	const ownedLineItemIds = await getOwnedLineItems(
		updates.map((x) => x.id),
		user.id,
	);

	await db.$transaction(async (tx) => {
		for (const u of updates) {
			if (user.role !== UserRole.Reviewer && !ownedLineItemIds.has(u.id)) {
				continue;
			}

			await tx.receiptLineItem.update({
				where: { id: u.id },
				data: { ...(u as any), updatedAt: new Date() },
			});
		}
	});
}

export async function deleteReceiptLineItems(lineItemIds: Array<string>) {
	"use server";
	const user = await getCurrentUser();

	const ownedLineItemIds = await getOwnedLineItems(lineItemIds, user.id);

	await db.$transaction(async (tx) => {
		for (const id of lineItemIds) {
			if (user.role !== UserRole.Reviewer && !ownedLineItemIds.has(id)) {
				continue;
			}

			await tx.receiptLineItem.delete({ where: { id } });
		}
	});
}
