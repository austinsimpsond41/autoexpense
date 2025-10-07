import { z } from "zod/v4";

export const ExtractReceiptLineItemSchema = z.object({
	description: z.string(),
	sku: z.string().optional(),
	quantity: z.number().default(1.0).optional(),
	unitPrice: z.number(),
	currency: z.string().default("USD").optional(),
});

export const ExtractReceiptSchema = z.object({
	merchant: z.object({
		name: z.string(),
		address: z.string().optional(),
	}),
	date: z.string().refine((x) => !isNaN(new Date(x).getTime())),
	currency: z.string(),
	category: z.string().optional(),
	tax: z.number(),
	tip: z.number(),
	paymentMethod: z.string().optional(),
	confidence: z.number(),
	items: z.array(ExtractReceiptLineItemSchema),
});

export type ExtractedReceiptData = z.infer<typeof ExtractReceiptSchema>;

export const PartialExtractReceiptSchema = z.object({
	merchant: z
		.object({
			name: z.string().optional(),
			address: z.string().optional(),
		})
		.optional(),
	date: z.string().optional(),
	currency: z.string().optional(),
	category: z.string().optional(),
	tax: z.number().optional(),
	tip: z.number().optional(),
	paymentMethod: z.string().optional(),
	confidence: z.number().optional(),
	items: z.array(ExtractReceiptLineItemSchema.partial()).optional(),
});

export type PartialExtractReceiptData = z.infer<typeof PartialExtractReceiptSchema>;
