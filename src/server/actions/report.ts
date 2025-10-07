"use server";

import { getCurrentUser } from "@/lib/auth";

import { db } from "@/server/db";
import { ExpenseReportStatus, UserRole, type ExpenseReport } from "@prisma/client";

export async function getReports() {
	"use server";
	const user = await getCurrentUser();

	console.log("getting expense reports");

	const result = await db.expenseReport.findMany({
		...(user.role === UserRole.Normal && {
			where: {
				userId: user.id,
			},
		}),
		...(user.role === UserRole.Reviewer && {
			where: {
				status: {
					not: ExpenseReportStatus.DRAFT,
				},
			},
		}),
	});

	return result;
}

export async function createReports(d: Array<ExpenseReport>) {
	"use server";
	const user = await getCurrentUser();
	await db.expenseReport.createMany({
		data: d.map((x) => ({ ...x, userId: user.id })),
	});
}

async function getOwnedReportIds(reportIds: Array<string>, userId: string) {
	const ownedReports = await db.expenseReport.findMany({
		where: {
			id: {
				in: reportIds,
			},
			userId: userId,
		},
		select: {
			id: true,
		},
	});

	return new Set(ownedReports.map((x) => x.id));
}

export async function updateReports(updates: Array<ExpenseReport>) {
	"use server";
	const user = await getCurrentUser();

	const ownedReportIds = await getOwnedReportIds(
		updates.map((x) => x.id),
		user.id,
	);

	await db.$transaction(async (tx) => {
		for (const update of updates) {
			if (user.role !== UserRole.Reviewer && !ownedReportIds.has(update.id)) {
				continue;
			}

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

export async function deleteReports(reportIds: Array<string>) {
	"use server";
	const user = await getCurrentUser();
	const ownedReportIds = await getOwnedReportIds(reportIds, user.id);

	await db.$transaction(async (tx) => {
		for (const id of reportIds) {
			if (user.role !== UserRole.Reviewer && !ownedReportIds.has(id)) {
				continue;
			}

			await tx.expenseReport.delete({
				where: {
					id,
				},
			});
		}
	});
}
