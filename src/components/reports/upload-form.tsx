"use client";

import React, { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { UploadExpenseReportFormSchema, type UploadExpenseReportFormData } from "@/lib/schemas/report-upload";
import { Label } from "../ui/label";
import { extractReceipt } from "@/server/actions/process-receipt";
import { readStreamableValue } from "@ai-sdk/rsc";
import { ReceiptPreview } from "./receipt-preview";

import { Loader2Icon, TrashIcon } from "lucide-react";
import { eq, or, useLiveQuery } from "@tanstack/react-db";
import {
	categoryCollection,
	merchantCollection,
	receiptCollection,
	receiptLineItemCollection,
	receiptsPendingExtractionCollection,
	type ReceiptExtractionData,
} from "@/client-db/collections";
import type { Category, Merchant, Receipt } from "@prisma/client";

import { createId as cuid2 } from "@paralleldrive/cuid2";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ReceiptView } from "./receipt-view";
import { cn } from "@/lib/utils";
import { useReportDateRange } from "@/hooks/use-report-date-range";
import { SpendByDayChart } from "./charts/spend-by-day";
import { SpendByCategoryChart } from "./charts/spend-by-category";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ExpenseReportStatusSelect } from "./status-select";
import { motion } from "motion/react";

type UploadFormProps = {
	initialData: UploadExpenseReportFormData;
	valueChanged: (d: UploadExpenseReportFormData) => void;
};

export default function UploadForm(props: UploadFormProps) {
	const { initialData } = props;
	const expenseReportId = initialData.id;

	const form = useForm({
		resolver: standardSchemaResolver(UploadExpenseReportFormSchema),
		defaultValues: props.initialData,
	});

	function startReceipt(file: File) {
		const receiptId = cuid2();
		receiptsPendingExtractionCollection.insert({
			id: receiptId,
			expenseReportId,
			status: "PENDING",
			file: file,
			partial: {},
			preview: !file.type.endsWith(".pdf") ? URL.createObjectURL(file) : null,
		});

		(async () => {
			const formData = new FormData();
			formData.set("file", file);
			formData.set("receipt-id", receiptId);
			formData.set("report-id", expenseReportId);
			const { receiptStream } = await extractReceipt(formData);

			receiptsPendingExtractionCollection.update(receiptId, (r) => {
				r.status = "EXTRACTING";
			});

			for await (const message of readStreamableValue(receiptStream)) {
				if (message === undefined) {
					continue;
				}
				switch (message.type) {
					case "partial": {
						const partial = message.partial;
						if (!partial) {
							continue;
						}

						receiptsPendingExtractionCollection.update(receiptId, (r) => {
							if (!r.partial) {
								return;
							}
							r.partial.merchant = partial.merchant;
							r.partial.category = partial.category ?? "Uncategorized";
							r.partial.confidence = partial.confidence;
							r.partial.date = partial.date;
							r.partial.items = partial.items?.map((x) => x!) ?? [];
							r.partial.paymentMethod = partial.paymentMethod;
							r.partial.tax = partial.tax;
						});
						break;
					}
					case "finished": {
						const { receipt, lineItems, merchant, category } = message.result;
						receiptCollection.utils.writeInsert([receipt]);
						receiptLineItemCollection.utils.writeInsert(lineItems);
						if (merchant) {
							merchantCollection.utils.writeInsert(merchant);
						}
						if (category) {
							categoryCollection.utils.writeInsert(category);
						}
						receiptsPendingExtractionCollection.delete(receiptId);
						break;
					}
				}
			}
		})();
	}

	const { data: receipts } = useLiveQuery((q) =>
		q
			.from({ receipt: receiptCollection })
			.fullJoin({ receiptExtraction: receiptsPendingExtractionCollection }, ({ receipt, receiptExtraction }) => eq(receipt.id, receiptExtraction.id))
			.leftJoin({ merchant: merchantCollection }, ({ receipt, merchant }) => eq(receipt?.merchantId, merchant.id))
			.leftJoin({ category: categoryCollection }, ({ receipt, category }) => eq(receipt?.categoryId, category.id))
			.orderBy(({ receipt }) => receipt?.date)
			.orderBy(({ merchant }) => merchant?.normalizedName)
			.where((q) => or(eq(q.receipt?.expenseReportId, initialData.id), eq(q.receiptExtraction?.expenseReportId, initialData.id))),
	);

	const { data: lineItems } = useLiveQuery((q) =>
		q
			.from({ lineItem: receiptLineItemCollection })
			.join({ receipt: receiptCollection }, ({ lineItem, receipt }) => eq(lineItem.receiptId, receipt.id))
			.where(({ receipt }) => eq(receipt?.expenseReportId, expenseReportId)),
	);

	const totalPaid = useMemo(() => {
		let total = 0.0;

		for (const { lineItem } of lineItems) {
			total += Number(lineItem.quantity) * Number(lineItem.unitPrice);
		}

		for (const { receipt } of receipts) {
			total += Number(receipt?.tax ?? 0) + Number(receipt?.tip ?? 0);
		}

		return total;
	}, [lineItems, receipts]);

	const [startDate, endDate] = useReportDateRange(expenseReportId);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	function onFileChanged(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;

		for (const file of e.target.files) {
			startReceipt(file);
		}
	}

	function onFileDrop(e: React.DragEvent) {
		e.preventDefault();
		const dropped = Array.from(e.dataTransfer.files || []);
		for (const file of dropped) {
			startReceipt(file);
		}
	}

	let timeoutId: undefined | NodeJS.Timeout = undefined;
	form.subscribe({
		formState: {
			values: true,
			isValid: true,
			isDirty: true,
		},
		callback: (d) => {
			if (!d.isDirty) {
				return;
			}

			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = undefined;
			}
			timeoutId = setTimeout(() => {
				props.valueChanged(d.values);
				timeoutId = undefined;
			}, 1000);
		},
	});

	const onSubmit = form.handleSubmit((values) => {});

	return (
		<div className="space-y-6">
			<Form {...form}>
				<form onSubmit={onSubmit} className="space-y-4">
					<h3 className="font-medium">Expense Report</h3>

					<FormField
						control={form.control}
						name="title"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Title</FormLabel>
								<FormControl>
									<Input placeholder="e.g., April Client Trip" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label>Start Date</Label>
							<div>{startDate ? startDate.toLocaleDateString() : "--"}</div>
						</div>

						<div className="space-y-1">
							<Label>End Date</Label>
							<div>{endDate ? endDate.toLocaleDateString() : "--"}</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Status</FormLabel>
									<FormControl>
										<ExpenseReportStatusSelect
											className="w-full"
											value={field.value}
											onValueChanged={(v) => {
												field.onChange(v);
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Notes (optional)</FormLabel>
								<FormControl>
									<Textarea rows={3} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</form>
				<Separator />
				<div onDragOver={(e) => e.preventDefault()} onDrop={onFileDrop} className="border-dashed border-2 rounded p-6" aria-label="Drop receipts here">
					<div className="flex flex-col lg:flex-row items-center justify-between">
						<div>
							<Label>Receipts</Label>
							<div className="text-sm text-muted-foreground">JPG, PNG, PDF. Multi-select supported.</div>
						</div>

						<div>
							<input ref={fileInputRef} type="file" multiple accept="image/*|application/pdf" onChange={onFileChanged} className="hidden" />
							<Button className="mt-4 w-52 lg:w-auto lg:mt-0" onClick={() => fileInputRef.current?.click()}>
								Select Files
							</Button>
						</div>
					</div>
				</div>

				<div className={cn("mb-6 grid grid-cols-1 lg:grid-cols-3 gap-x-4", receipts.filter((x) => x.receipt !== undefined).length === 0 && "hidden")}>
					<div className="p-4 rounded border border-border col-span-2">
						<h2 className="font-semibold text-base mb-2">Spend by Day</h2>
						<SpendByDayChart reportId={expenseReportId} />
					</div>
					<div className="p-4 rounded border border-border">
						<h2 className="font-semibold text-base mb-2">Spend by Category</h2>
						<SpendByCategoryChart reportId={expenseReportId} />
					</div>
					<div className="space-y-2 my-4">
						<Label>Total Spent</Label>
						<div className="text-2xl">{totalPaid.toLocaleString(undefined, { style: "currency", currency: "USD" })}</div>
					</div>
				</div>

				<div className="space-y-2">
					{receipts.map((x) => (
						<UploadFormReceiptPreview key={x.receipt?.id || x.receiptExtraction?.id} receiptWithExtraction={x} />
					))}
				</div>
			</Form>
		</div>
	);
}

type UploadFormReceiptPreviewProps = {
	receiptWithExtraction: { receipt?: Receipt; receiptExtraction?: ReceiptExtractionData; category?: Category; merchant?: Merchant };
};

function UploadFormReceiptPreview(props: UploadFormReceiptPreviewProps) {
	const [open, setOpen] = useState(true);
	const {
		receiptWithExtraction: { receipt, receiptExtraction, category, merchant },
	} = props;

	const partial = receiptExtraction?.partial;

	const source = receipt !== undefined ? `/api/receipt/file?id=${receipt.id}` : receiptExtraction?.preview;
	const isImage = !(receiptExtraction?.file.name.endsWith(".pdf") ?? false);

	return (
		<motion.div layout layoutId={receiptExtraction?.id || receipt?.id}>
			<Collapsible open={open} onOpenChange={setOpen}>
				<div className={cn("flex items-center gap-3 p-2 rounded w-full border", open ? "rounded-b-none" : "rounded-b")}>
					<div className="w-16 h-12 bg-slate-50 flex items-center justify-center rounded overflow-hidden">
						{isImage && source && (
							<Dialog>
								<DialogTrigger>
									<img src={source} alt={receiptExtraction?.file.name} className="w-full h-full object-cover" />
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>View Receipt</DialogTitle>
										<img src={source} alt={receiptExtraction?.file.name} className="w-full h-full object-cover" />
									</DialogHeader>
								</DialogContent>
							</Dialog>
						)}
						{!isImage && <div className="text-sm font-medium">PDF</div>}
					</div>

					<CollapsibleTrigger asChild>
						<div className="flex-1 min-w-0 cursor-pointer">
							<div className="font-medium truncate flex items-center gap-1">
								{receiptExtraction?.file.name ?? ""}
								{merchant && merchant.name}
								{(receiptExtraction?.status === "PENDING" || receiptExtraction?.status === "EXTRACTING") && (
									<Loader2Icon className="size-4 animate-spin"></Loader2Icon>
								)}
							</div>
							<div className="text-xs text-muted-foreground">{((receiptExtraction?.file.size ?? 0) / 1024).toFixed(1)} KB</div>
						</div>
					</CollapsibleTrigger>
					<div>
						{receipt && (
							<Button variant="ghost" className="text-destructive size-8 p-0" onClick={() => receiptCollection.delete(receipt.id)}>
								<TrashIcon className="size-4" />
							</Button>
						)}
					</div>
				</div>
				<CollapsibleContent className="p-4 border border-border border-t-0 rounded-b">
					{!receipt && partial && <ReceiptPreview receipt={partial} />}
					{receipt && category && merchant && <ReceiptView receipt={receipt} category={category} merchant={merchant} />}
				</CollapsibleContent>
			</Collapsible>
		</motion.div>
	);
}
