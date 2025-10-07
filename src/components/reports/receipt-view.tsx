"use client";

import React, { useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import type { Category, Merchant, Receipt, ReceiptLineItem } from "@prisma/client";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { receiptCollection, receiptLineItemCollection } from "@/client-db/collections";
import { Input } from "../ui/input";
import { DollarSignIcon, PlusIcon } from "lucide-react";
import { z } from "zod/v4";
import { useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { Form, FormControl, FormField, FormItem } from "../ui/form";

import { createId as cuid2 } from "@paralleldrive/cuid2";
import { InlineEdit, InlineEditContent, InlineEditTrigger } from "../ui/inline-edit";
import { Badge } from "../ui/badge";
import { ReceiptImageView } from "./receipt-images-view";
import { CategorySelect } from "../category/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";

import { motion } from "motion/react";

type ReceiptViewProps = {
	receipt: Receipt;
	merchant: Merchant;
	category: Category;
};

export function ReceiptView({ receipt, merchant, category }: ReceiptViewProps) {
	const { data: items } = useLiveQuery((q) => q.from({ lineItem: receiptLineItemCollection }).where(({ lineItem }) => eq(lineItem.receiptId, receipt.id)));

	console.log(category);

	const currency = (items[0]?.currency as string) || "USD";

	const subtotal = items.reduce((sum, it) => {
		const price = Number(it?.unitPrice ?? 0);
		const qty = Number(it?.quantity ?? 1);
		return sum + price * qty;
	}, 0);

	const tax = Number(receipt?.tax ?? 0);
	const tip = Number(receipt?.tip ?? 0);
	const total = subtotal + tax + tip;

	const date = receipt?.date ? new Date(String(receipt.date)) : undefined;
	const formattedDate = date ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date) : "Unknown date";

	const formatMoney = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);

	const [editingTip, setEditingTip] = useState(false);
	const tipInputRef = useRef<HTMLInputElement>(null);
	function updateTip() {
		if (!tipInputRef.current) {
			return;
		}
		const s = tipInputRef.current.value;
		const newTip = parseFloat(s);
		if (isNaN(newTip)) {
			return;
		}

		receiptCollection.update(receipt.id, (r) => {
			r.tip = newTip as any;
			setEditingTip(false);
		});
	}

	const [editingTax, setEditingTax] = useState(false);
	const taxInputRef = useRef<HTMLInputElement>(null);
	function updateTax() {
		if (!taxInputRef.current) {
			return;
		}
		const s = taxInputRef.current.value;
		const newTax = parseFloat(s);
		if (isNaN(newTax)) {
			return;
		}

		receiptCollection.update(receipt.id, (r) => {
			r.tax = newTax as any;
			setEditingTax(false);
		});
	}

	const [datePickerOpen, setDatePickerOpen] = useState(false);

	return (
		<div className={"space-y-3"}>
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-2">
						<div className="font-medium">{merchant?.name ?? "Unknown merchant"}</div>
						{category && (
							<CategorySelect
								value={category.id}
								onValueChanged={(categoryId) =>
									receiptCollection.update(receipt.id, (r) => {
										r.categoryId = categoryId;
									})
								}
							>
								<Badge variant="secondary">{category.name}</Badge>
							</CategorySelect>
						)}
					</div>
					{merchant?.address && <div className="text-xs text-muted-foreground">{merchant.address}</div>}
				</div>

				<div className="text-right text-xs text-muted-foreground">
					<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
						<PopoverTrigger>
							<div>{formattedDate}</div>
						</PopoverTrigger>
						<PopoverContent>
							<Calendar
								mode="single"
								defaultMonth={receipt.date ?? new Date()}
								selected={receipt.date ?? new Date()}
								onSelect={(d) => {
									if (d) {
										receiptCollection.update(receipt.id, (r) => (r.date = d));
									}
									setDatePickerOpen(false);
								}}
							/>
						</PopoverContent>
					</Popover>
					{receipt?.confidence && <div>{Math.round((receipt.confidence as number) * 100)}% confidence</div>}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16">
				<ReceiptImageView receiptId={receipt.id} pageCount={receipt.pageCount} />
				<div>
					<div className="w-full overflow-x-auto">
						<Table className="w-full text-sm table-fixed">
							<TableHeader className="text-left text-xs text-muted-foreground">
								<TableRow>
									<TableHead>Description</TableHead>
									<TableHead className="w-24">Qty</TableHead>
									<TableHead className="w-24">Unit</TableHead>
									<TableHead className="w-24 text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((li) => (
									<ReceiptViewLineItemRow lineItem={li} />
								))}
								<TableRow>
									<TableCell colSpan={4}>
										<button
											className="w-full flex items-center gap-1 justify-center cursor-pointer"
											onClick={() =>
												receiptLineItemCollection.insert({
													id: cuid2(),
													receiptId: receipt.id,
													description: "New item",
													quantity: 1 as any,
													sku: null,
													currency: "USD",
													unitPrice: 0.0 as any,
													createdAt: new Date(),
													updatedAt: new Date(),
												})
											}
										>
											<PlusIcon className="size-4"></PlusIcon>
											Add Line Item
										</button>
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
						<div className="flex justify-end text-sm">
							<div className="w-48">
								<div className="flex justify-between text-muted-foreground">
									<div>Subtotal</div>
									<div>{formatMoney(subtotal)}</div>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<div>Tax</div>
									<InlineEdit
										open={editingTax}
										setOpen={(isOpen) => {
											if (!isOpen) {
												updateTax();
											}
											setEditingTax(isOpen);
										}}
									>
										<InlineEditTrigger>{formatMoney(tax)}</InlineEditTrigger>
										<InlineEditContent className="relative">
											<DollarSignIcon className="size-3 left-4 top-1 absolute" />
											<Input
												ref={taxInputRef}
												className="w-20 h-5 text-right translate-x-3"
												defaultValue={tax.toFixed(2)}
												onKeyDown={(k) => {
													if (k.key === "Enter") {
														updateTax();
														k.preventDefault();
													}
												}}
											/>
										</InlineEditContent>
									</InlineEdit>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<div>Tip</div>
									<InlineEdit
										open={editingTip}
										setOpen={(isOpen) => {
											if (!isOpen) {
												updateTip();
											}
											setEditingTip(isOpen);
										}}
									>
										<InlineEditTrigger>{formatMoney(tip)}</InlineEditTrigger>
										<InlineEditContent className="relative">
											<DollarSignIcon className="size-3 left-4 top-1 absolute" />
											<Input
												ref={tipInputRef}
												className="w-20 h-5 text-right translate-x-3"
												defaultValue={tip.toFixed(2)}
												onKeyDown={(k) => {
													if (k.key === "Enter") {
														updateTip();
														k.preventDefault();
													}
												}}
											/>
										</InlineEditContent>
									</InlineEdit>
								</div>
								<div className="flex justify-between font-medium mt-1">
									<div>Total</div>
									<div>{formatMoney(total)}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

type ReceiptViewLineItemRowProps = {
	lineItem: ReceiptLineItem;
};

const EditLineItemSchema = z.object({
	description: z.string(),
	quantity: z.coerce.number(),
	unitPrice: z.coerce.number(),
});

function ReceiptViewLineItemRow(props: ReceiptViewLineItemRowProps) {
	const { lineItem } = props;
	const qty = Number(lineItem?.quantity ?? 1);
	const unit = Number(lineItem.unitPrice ?? 0);
	const lineTotal = qty * unit;

	const formatMoney = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: lineItem.currency ?? "USD" }).format(v);

	const [editing, setEditing] = useState(false);

	const form = useForm({
		resolver: standardSchemaResolver(EditLineItemSchema),
		defaultValues: {
			description: lineItem.description,
			quantity: lineItem.quantity.toString(),
			unitPrice: Number(lineItem.unitPrice).toFixed(2),
		},
	});

	const tableRowRef = useRef(null);

	function submitForm() {
		if (!editing) {
			setEditing(false);
			return;
		}
		form.handleSubmit(
			(d) => {
				if (d.quantity > 0) {
					receiptLineItemCollection.update(lineItem.id, (li) => {
						li.description = d.description;
						li.quantity = d.quantity as any;
						li.unitPrice = d.unitPrice as any;
					});
				} else {
					receiptLineItemCollection.delete(lineItem.id);
				}

				setEditing(false);
			},
			(e) => console.log(e),
		)();
	}

	const editQuantity = useWatch({
		control: form.control,
		name: "quantity",
	});

	const editUnitPrice = useWatch({
		control: form.control,
		name: "unitPrice",
	});

	const editTotal = Number(editQuantity ?? 0) * Number(editUnitPrice ?? 0);

	useOutsideClick(tableRowRef, submitForm);

	return (
		<TableRow className="border-t overflow-visible" onClick={() => setEditing(true)} ref={tableRowRef}>
			{!editing && (
				<>
					<TableCell>{lineItem.description ?? "-"}</TableCell>
					<TableCell>{qty}</TableCell>
					<TableCell>{formatMoney(unit)}</TableCell>
					<TableCell className="text-right">{formatMoney(lineTotal)}</TableCell>
				</>
			)}
			{editing && (
				<Form {...form}>
					<TableCell>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input className="-translate-x-3 h-5" {...field} />
									</FormControl>
								</FormItem>
							)}
						/>
					</TableCell>
					<TableCell>
						<FormField
							control={form.control}
							name="quantity"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input className="-translate-x-3 h-5" {...field} value={field.value as string | number} />
									</FormControl>
								</FormItem>
							)}
						/>
					</TableCell>
					<TableCell>
						<FormField
							control={form.control}
							name="unitPrice"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<div className="relative">
											<DollarSignIcon className="size-3 left-0.0 top-1 absolute" />
											<Input className="-translate-x-2 h-5 pl-5" {...field} value={field.value as string | number} />
										</div>
									</FormControl>
								</FormItem>
							)}
						/>
					</TableCell>
					<TableCell className="text-right flex gap-1 items-center justify-end">
						<div>{formatMoney(editTotal)}</div>
					</TableCell>
				</Form>
			)}
		</TableRow>
	);
}
