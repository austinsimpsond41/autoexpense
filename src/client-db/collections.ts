import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, localOnlyCollectionOptions } from "@tanstack/db";

import { getQueryClient } from "@/react-query/react";
import { createReports, deleteReports, getReports, updateReports } from "@/server/actions/report";
import { createReceipts, deleteReceipts, getReceipts, updateReceipts } from "@/server/actions/receipt";
import { createReceiptLineItems, deleteReceiptLineItems, getReceiptLineItems, updateReceiptLineItems } from "@/server/actions/receipt-line-item";
import { createMerchants, deleteMerchants, getMerchants, updateMerchants } from "@/server/actions/merchant";
import { z } from "zod/v4";
import { PartialExtractReceiptSchema } from "@/lib/schemas/extract-receipt";
import { createCategories, deleteCategories, getCategories, updateCategories } from "@/server/actions/category";

const queryClient = getQueryClient();

export const reportCollection = createCollection(
	queryCollectionOptions({
		queryKey: ["reports"],
		queryFn: async () => {
			return await getReports();
		},
		getKey: (x) => x.id,
		queryClient,
		onInsert: async (tx) => {
			const inserts = tx.transaction.mutations.map((x) => ({ ...x.modified }));
			await createReports(inserts);
		},
		onUpdate: async (tx) => {
			const updates = tx.transaction.mutations.map((x) => ({ ...x.modified }));
			await updateReports(updates);
		},
		onDelete: async (tx) => {
			const keys = tx.transaction.mutations.map((x) => x.key);
			await deleteReports(keys);
		},
	}),
);

export const receiptCollection = createCollection(
	queryCollectionOptions({
		queryKey: ["receipts"],
		queryFn: async () => {
			return await getReceipts();
		},
		getKey: (x) => x.id,
		onInsert: async (tx) => {
			const inserts = tx.transaction.mutations.map((x) => x.modified);
			await createReceipts(inserts);
		},
		onUpdate: async (tx) => {
			const updates = tx.transaction.mutations.map((x) => ({
				...x.modified,
				metadata: x.modified.metadata,
			}));
			await updateReceipts(updates);
		},
		onDelete: async (tx) => {
			const toDelete = tx.transaction.mutations.map((x) => x.key);
			await deleteReceipts(toDelete);
		},
		queryClient,
	}),
);

export const receiptLineItemCollection = createCollection(
	queryCollectionOptions({
		queryKey: ["receiptLineItems"],
		queryFn: async () => {
			return await getReceiptLineItems();
		},
		getKey: (x) => x.id,
		onInsert: async (tx) => {
			const inserts = tx.transaction.mutations.map((x) => x.modified);
			await createReceiptLineItems(inserts);
		},
		onUpdate: async (tx) => {
			const updates = tx.transaction.mutations.map((x) => ({
				...x.modified,
			}));
			await updateReceiptLineItems(updates);
		},
		onDelete: async (tx) => {
			const toDelete = tx.transaction.mutations.map((x) => x.key);
			await deleteReceiptLineItems(toDelete);
		},
		queryClient,
	}),
);

export const merchantCollection = createCollection(
	queryCollectionOptions({
		queryKey: ["merchants"],
		queryFn: async () => {
			return await getMerchants();
		},
		getKey: (x) => x.normalizedName,
		onInsert: async (tx) => {
			const inserts = tx.transaction.mutations.map((x) => x.modified);
			await createMerchants(inserts);
		},
		onUpdate: async (tx) => {
			const updates = tx.transaction.mutations.map((x) => ({
				...x.modified,
			}));
			await updateMerchants(updates);
		},
		onDelete: async (tx) => {
			const toDelete = tx.transaction.mutations.map((x) => x.key);
			await deleteMerchants(toDelete);
		},
		queryClient,
	}),
);

export const categoryCollection = createCollection(
	queryCollectionOptions({
		queryKey: ["categories"],
		queryFn: async () => {
			return await getCategories();
		},
		getKey: (x) => x.normalizedName,
		onInsert: async (tx) => {
			const inserts = tx.transaction.mutations.map((x) => x.modified);
			await createCategories(inserts);
		},
		onUpdate: async (tx) => {
			const updates = tx.transaction.mutations.map((x) => ({
				...x.modified,
			}));
			await updateCategories(updates);
		},
		onDelete: async (tx) => {
			const toDelete = tx.transaction.mutations.map((x) => x.key);
			await deleteCategories(toDelete);
		},
		queryClient,
	}),
);

const ReceiptExtractionSchema = z.object({
	id: z.cuid2(),
	expenseReportId: z.cuid2(),
	file: z.file(),
	status: z.enum(["PENDING", "EXTRACTING", "DONE"]),
	partial: PartialExtractReceiptSchema.optional(),
	preview: z.string().nullable(),
});

export type ReceiptExtractionData = z.infer<typeof ReceiptExtractionSchema>;

export const receiptsPendingExtractionCollection = createCollection(
	localOnlyCollectionOptions({
		schema: ReceiptExtractionSchema,
		getKey: (x) => x.id,
	}),
);
