"use server";

import { db } from "@/server/db";
import { type Category } from "@prisma/client";

export async function getCategories() {
	"use server";
	return await db.category.findMany();
}

export async function createCategories(d: Array<Category>) {
	"use server";
	await db.category.createMany({
		data: d,
	});
}

export async function updateCategories(updates: Array<Category>) {
	"use server";
	await db.$transaction(async (tx) => {
		for (const update of updates) {
			await tx.expenseReport.update({
				data: {
					...update,
					updatedAt: new Date(),
				},
				where: {
					id: update.id,
				},
			});
		}
	});
}

export async function deleteCategories(reportIds: Array<string>) {
	"use server";
	await db.$transaction(async (tx) => {
		for (const id of reportIds) {
			await tx.expenseReport.delete({
				where: {
					id,
				},
			});
		}
	});
}
