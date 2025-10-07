"use server";

import { ai } from "@/lib/ai";

import fs from "fs";
import { streamObject } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";

import { ExtractReceiptSchema, type ExtractedReceiptData } from "@/lib/schemas/extract-receipt";
import type { Category, Merchant, PrismaClient, Receipt, ReceiptLineItem } from "@prisma/client";
import type { DeepPartial } from "@/lib/types/deep-partial";
import { db, type PrismaTransaction } from "../db";
import { storage } from "../storage";
import { blob } from "stream/consumers";
import { pdfToImages } from "@/lib/pdf";

type ReceiptExtractionResult = {
	receipt: Receipt;
	lineItems: Array<ReceiptLineItem>;
	merchant: Merchant | undefined;
	category: Category | undefined;
};

export type ReceiptExtractionStreamMessage =
	| {
			type: "partial";
			partial: DeepPartial<ExtractedReceiptData>;
	  }
	| {
			type: "finished";
			result: ReceiptExtractionResult;
	  };

function documentTypeFromMime(mime: string) {
	if (mime.startsWith("image/")) {
		return "image" as const;
	} else if (mime.includes("pdf") || mime.includes("acrobat")) {
		return "pdf" as const;
	} else {
		throw new Error(`can't process file with type: ${mime}`);
	}
}

export async function extractReceipt(formData: FormData) {
	"use server";

	const stream = createStreamableValue<ReceiptExtractionStreamMessage>();

	// Support single file or multiple files under the "files" field
	const file = formData.get("file");
	const receiptId = formData.get("receipt-id") as string;
	const reportId = formData.get("report-id") as string;

	if (!file || !(file instanceof File)) {
		throw new Error("did not receive a file");
	}

	if (!receiptId) {
		throw new Error("you must provide a receipt id.");
	}

	if (!reportId) {
		throw new Error("you must provide an expense report id");
	}

	const documentType = documentTypeFromMime(file.type);
	const fileBuffer = await file.arrayBuffer();

	const files =
		documentType === "image"
			? [{ buffer: fileBuffer, extension: file.name.split(".")[1] }]
			: (await pdfToImages(Buffer.from(fileBuffer))).map((x) => ({ buffer: x, extension: "png" }));

	const systemPrompt = `
		You are a JSON extraction assistant. Given OCR text or a photo of a receipt (attached as files), return a single JSON object that exactly matches the ExtractReceiptSchema (merchant, date, tax, tip, paymentMethod, confidence, currency, items). Output only valid JSON and nothing else.
		
		Rules:
		- Output shape: top-level object with keys: merchant, date, tax, tip, paymentMethod, confidence, items, currency.
		- merchant: object with name (string, required) and address (string, optional).
		- date: string in ISO 8601 date format (YYYY-MM-DD). If only month/day are present, infer the most plausible year; prefer the most recent plausible year and lower confidence when inferred. If multiple dates are present, pick the latest one.
		- tax: number (float). If no tax line, set tax to 0. Only include tax if not present in line items. If multiple taxes apply, add them as separate line items.
		- tip: number (float). If no tip line, set tip to 0.
		- paymentMethod: string (optional). Use tokens like "VISA", "MASTERCARD", "AMEX", "CASH", or a card last4 like "VISA ****1234" when available.
		- confidence: number between 0 and 1 representing overall extraction confidence. Use 1.0 for high certainty and lower values for guesses/estimates.
		- currency: the currency used in the transaction. default to usd
		- category: category of the purchase. Could be one of the following but not limited to: Airfare, Breakfast, Lunch, Dinner, Taxi, Registration Fees, etc. (optional).
		- items: array of objects matching ExtractReceiptLineItemSchema:
			- description: string (required).
			- sku: string (optional).
			- quantity: number (float) — default to 1.0 when not listed.
			- unitPrice: number (float) — price per unit, without currency symbols.
			- currency: string (3-letter ISO code, e.g., "USD") — default to "USD" if unknown.
		
		Additional rules:
		- If multiple files are uploaded, treat them as a single receipt.
		- Use JSON numbers for numeric values (not strings). date must be a string.
		- Do not include any fields outside the schema.
		- Round monetary values to two decimal places where appropriate; avoid thousands separators.
		- If a value is guessed or estimated, reflect uncertainty by lowering the overall confidence. If an item is unreadable, omit it rather than inventing it.
		
		Return only the JSON object that validates against the schema and nothing else.`;

	(async () => {
		const { partialObjectStream } = streamObject({
			model: ai,
			schema: ExtractReceiptSchema,
			output: "object",
			messages: [
				{ role: "system", content: systemPrompt },
				{
					role: "user",
					content: [
						{ type: "text", text: "Please extract receipt information from the attached file(s). Return only the JSON object that matches the schema." },
						...files.map((x) => ({
							type: "image" as const,
							image: Buffer.from(x.buffer),
						})),
					],
				},
			],
		});

		let last: unknown | undefined = undefined;
		for await (const partialObject of partialObjectStream) {
			last = partialObject;
			stream.update({ type: "partial", partial: partialObject });
		}

		const fullReceiptResult = ExtractReceiptSchema.safeParse(last);
		if (fullReceiptResult.success) {
			const container = storage.getContainerClient(`receipts`);

			for (const [index, file] of files.entries()) {
				const blobClient = container.getBlockBlobClient(`${reportId}/${receiptId}/receipt-${index}.${file.extension}`);
				await blobClient.upload(Buffer.from(file.buffer), file.buffer.byteLength);
			}

			const [createdReceipt, createdLineItems, createdMerchant, createdCategory] = await createExpenseReportFromParse(
				fullReceiptResult.data,
				reportId,
				receiptId,
				files.length,
			);

			stream.done({
				type: "finished",
				result: {
					receipt: createdReceipt,
					lineItems: createdLineItems,
					merchant: createdMerchant,
					category: createdCategory,
				},
			});
			return;
		}

		stream.done();
	})();

	return { receiptStream: stream.value };
}

async function createMerchantIfNotExists(merchant: ExtractedReceiptData["merchant"], tx: PrismaTransaction) {
	const normalizedMerchantName = merchant.name.toUpperCase();
	const existingMerchant = await tx.merchant.findUnique({
		where: {
			normalizedName: normalizedMerchantName,
		},
	});

	let createdMerchant: Merchant | undefined = undefined;
	if (!existingMerchant) {
		createdMerchant = await tx.merchant.create({
			select: {
				id: true,
				name: true,
				normalizedName: true,
				createdAt: true,
				updatedAt: true,
				address: true,
			},
			data: {
				...merchant,
				normalizedName: normalizedMerchantName,
			},
		});
	}

	const merchantToReturn = existingMerchant ?? createdMerchant;
	if (!merchantToReturn) {
		throw new Error("this shouldnt be possible. merchantId is null");
	}

	const wasMerchantCreated = createdMerchant !== undefined;
	return [merchantToReturn, wasMerchantCreated] as const;
}

async function createCategoryIfNotExists(category: string, tx: PrismaTransaction) {
	const normalizedCategory = category.toUpperCase();
	const existingCategory = await tx.category.findUnique({
		where: {
			normalizedName: normalizedCategory,
		},
	});

	let createdCategory: Category | undefined = undefined;
	if (!existingCategory) {
		createdCategory = await tx.category.create({
			select: {
				id: true,
				name: true,
				normalizedName: true,
				createdAt: true,
				updatedAt: true,
			},
			data: {
				name: category,
				normalizedName: normalizedCategory,
			},
		});
	}

	const categoryToReturn = existingCategory ?? createdCategory;
	if (!categoryToReturn) {
		throw new Error("this shouldnt be possible. merchantId is null");
	}

	const wasCategoryCreated = createdCategory !== undefined;
	return [categoryToReturn, wasCategoryCreated] as const;
}

async function createExpenseReportFromParse(fullReceipt: ExtractedReceiptData, reportId: string, receiptId: string, pageCount: number) {
	return await db.$transaction(async (tx) => {
		const [merchant, wasMerchantCreated] = await createMerchantIfNotExists(fullReceipt.merchant, tx);
		const [category, wasCategoryCreated] = await createCategoryIfNotExists(fullReceipt.category ?? "Uncategorized", tx);

		const createdReceipt = await tx.receipt.create({
			data: {
				id: receiptId,
				expenseReportId: reportId,
				merchantId: merchant.id,
				categoryId: category.id,
				pageCount,
				tax: fullReceipt.tax,
				tip: fullReceipt.tip,
				date: new Date(fullReceipt.date),
				paymentMethod: fullReceipt.paymentMethod,
				confidence: fullReceipt.confidence,
				currency: fullReceipt.currency,
			},
		});

		const createdLineItems = await tx.receiptLineItem.createManyAndReturn({
			data: fullReceipt.items.map((x) => ({
				currency: x.currency,
				receiptId: receiptId,
				description: x.description,
				unitPrice: x.unitPrice,
				quantity: x.quantity,
			})),
		});

		return [createdReceipt, createdLineItems, wasMerchantCreated ? merchant : undefined, wasCategoryCreated ? category : undefined] as const;
	});
}
