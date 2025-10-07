"use client";

import { receiptCollection, receiptLineItemCollection } from "@/client-db/collections";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useReportDateRange } from "@/hooks/use-report-date-range";
import type { ReceiptLineItem } from "@prisma/client";
import { eq, useLiveQuery } from "@tanstack/react-db";

import { eachDayOfInterval, isSameDay } from "date-fns";
import { useMemo } from "react";
import { Bar, BarChart, Legend, Line, LineChart, Tooltip, XAxis } from "recharts";

type SpendByDayChartProps = {
	reportId: string;
};

export function SpendByDayChart(props: SpendByDayChartProps) {
	const { reportId } = props;
	const [start, end] = useReportDateRange(reportId);

	const endToUse = end ?? new Date();

	const { data: receipts } = useLiveQuery((q) => q.from({ receipt: receiptCollection }).where(({ receipt }) => eq(receipt.expenseReportId, reportId)));
	const { data: lineItemsWithReceipt } = useLiveQuery((q) =>
		q
			.from({ lineItem: receiptLineItemCollection })
			.innerJoin({ receipt: receiptCollection }, ({ lineItem, receipt }) => eq(lineItem.receiptId, receipt.id))
			.where(({ receipt }) => eq(receipt.expenseReportId, reportId)),
	);

	const chartData = useMemo(() => {
		if (!start) {
			return [];
		}

		const result = [];
		const days = eachDayOfInterval({ start, end: endToUse });

		const totalsByDay = new Map<string, number>();
		for (const { lineItem, receipt } of lineItemsWithReceipt) {
			const dateStr = receipt.date?.toLocaleDateString() ?? "(No date)";
			if (!totalsByDay.has(dateStr)) {
				totalsByDay.set(dateStr, 0);
			}

			const runningTotal = totalsByDay.get(dateStr)!;
			totalsByDay.set(dateStr, runningTotal + Number(lineItem.quantity ?? 1) * Number(lineItem.unitPrice ?? 0.0));
		}

		for (const receipt of receipts) {
			const dateStr = receipt.date?.toLocaleDateString() ?? "(No date)";
			if (!totalsByDay.has(dateStr)) {
				totalsByDay.set(dateStr, 0);
			}

			const runningTotal = totalsByDay.get(dateStr)!;
			totalsByDay.set(dateStr, runningTotal + (Number(receipt.tax ?? 0) + Number(receipt.tip ?? 0)));
		}

		for (const day of days) {
			const dateStr = day.toLocaleDateString();
			const totalForDay = totalsByDay.get(dateStr) ?? 0;
			result.push({ date: dateStr, total: totalForDay });
		}

		return result;
	}, [start, endToUse, lineItemsWithReceipt, receipts]);

	const chartConfig = {
		total: {
			label: "Total",
			color: "#2563eb",
		},
	};

	if (!start) {
		return null;
	}
	return (
		<div className="flex flex-row items-center gap-4">
			<ChartContainer config={chartConfig} className="h-[200px] w-full">
				<BarChart accessibilityLayer data={chartData}>
					<ChartTooltip content={<ChartTooltipContent />} />
					<XAxis dataKey={"date"} />
					<Bar dataKey={"total"} radius={4} fill="var(--color-total)" />
				</BarChart>
			</ChartContainer>
		</div>
	);
}
