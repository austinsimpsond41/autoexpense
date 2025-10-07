"use client";

import React from "react";
import type { ExtractedReceiptData, PartialExtractReceiptData } from "@/lib/schemas/extract-receipt";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";

type ReceiptPreviewProps = {
	receipt?: PartialExtractReceiptData;
};

export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
	const items = receipt?.items ?? [];
	const currency = (items[0]?.currency as string) || "USD";

	const subtotal = items.reduce((sum, it) => {
		const price = Number(it?.unitPrice ?? 0);
		const qty = Number(it?.quantity ?? 1);
		return sum + price * qty;
	}, 0);

	const tax = Number(receipt?.tax ?? 0);
	const tip = Number(receipt?.tip ?? 0);
	const total = subtotal + tax + tip;

	const date = receipt?.date ? new Date(receipt.date) : undefined;
	const formattedDate = date && !isNaN(date.getTime()) ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date) : "Unknown date";

	const formatMoney = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);

	return (
		<div className={"space-y-3"}>
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-2">
						<div className="font-medium">{receipt?.merchant?.name ?? "Unknown merchant"}</div>
						<Badge variant="secondary">{receipt?.category ?? "Uncategorized"}</Badge>
					</div>
					{receipt?.merchant?.address && <div className="text-xs text-muted-foreground">{receipt.merchant.address}</div>}
				</div>

				<div className="text-right text-xs text-muted-foreground">
					<div>{formattedDate}</div>
					{typeof receipt?.confidence === "number" && <div>{Math.round((receipt.confidence as number) * 100)}% confidence</div>}
				</div>
			</div>

			<div>
				{items.length === 0 ? (
					<div className="text-sm text-muted-foreground">No line items found</div>
				) : (
					<div className="w-full overflow-x-auto">
						<Table className="w-full text-sm">
							<TableHeader className="text-left text-xs text-muted-foreground">
								<TableRow>
									<TableHead>Description</TableHead>
									<TableHead>Qty</TableHead>
									<TableHead>Unit</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<tbody>
								{items.map((it, i) => {
									const qty = Number(it?.quantity ?? 1);
									const unit = Number(it?.unitPrice ?? 0);
									const lineTotal = qty * unit;
									return (
										<TableRow key={i} className="border-t">
											<TableCell>{it?.description ?? "-"}</TableCell>
											<TableCell>{qty}</TableCell>
											<TableCell>{formatMoney(unit)}</TableCell>
											<TableCell className="text-right">{formatMoney(lineTotal)}</TableCell>
										</TableRow>
									);
								})}
							</tbody>
						</Table>
					</div>
				)}
			</div>

			<div className="flex justify-end text-sm">
				<div className="w-48">
					<div className="flex justify-between text-muted-foreground">
						<div>Subtotal</div>
						<div>{formatMoney(subtotal)}</div>
					</div>
					<div className="flex justify-between text-muted-foreground">
						<div>Tax</div>
						<div>{formatMoney(tax)}</div>
					</div>
					<div className="flex justify-between text-muted-foreground">
						<div>Tip</div>
						<div>{formatMoney(tip)}</div>
					</div>
					<div className="flex justify-between font-medium mt-1">
						<div>Total</div>
						<div>{formatMoney(total)}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
