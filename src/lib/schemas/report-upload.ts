import { z } from "zod/v4";
import { ExtractReceiptSchema } from "./extract-receipt";

import { createId as cuid2 } from "@paralleldrive/cuid2";
import { ExpenseReportStatus } from "@prisma/client";

const UploadedReceiptSchema = z.object({
	receiptId: z.cuid2(),
	file: z.file(),
	extractedData: ExtractReceiptSchema.partial().optional(),
});

export type UploadedReceiptData = z.infer<typeof UploadedReceiptSchema>;

export const UploadExpenseReportFormSchema = z.object({
	id: z.cuid2(),
	title: z.string().min(1, "Title is required"),
	description: z.string(),
	status: z.enum([ExpenseReportStatus.DRAFT, ExpenseReportStatus.SUBMITTED, ExpenseReportStatus.REJECTED, ExpenseReportStatus.APPROVED]),
});

export type UploadExpenseReportFormData = z.infer<typeof UploadExpenseReportFormSchema>;
