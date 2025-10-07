"use client";

import { categoryCollection, receiptCollection, receiptLineItemCollection } from "@/client-db/collections";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useReportDateRange } from "@/hooks/use-report-date-range";
import type { ReceiptLineItem } from "@prisma/client";
import { eq, useLiveQuery } from "@tanstack/react-db";

import { eachDayOfInterval, isSameDay } from "date-fns";
import { useMemo } from "react";
import { Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis } from "recharts";

type SpendByCategoryChartProps = {
	reportId: string;
};

export function SpendByCategoryChart(props: SpendByCategoryChartProps) {
	const { reportId } = props;

	const { data: receipts } = useLiveQuery((q) =>
		q
			.from({ receipt: receiptCollection })
			.innerJoin({ category: categoryCollection }, ({ receipt, category }) => eq(receipt.categoryId, category.id))
			.where(({ receipt }) => eq(receipt.expenseReportId, reportId)),
	);
	const { data: lineItemsWithReceipt } = useLiveQuery((q) =>
		q
			.from({ lineItem: receiptLineItemCollection })
			.innerJoin({ receipt: receiptCollection }, ({ lineItem, receipt }) => eq(lineItem.receiptId, receipt.id))
			.innerJoin({ category: categoryCollection }, ({ receipt, category }) => eq(receipt.categoryId, category.id))
			.where(({ receipt }) => eq(receipt.expenseReportId, reportId)),
	);

	const chartData = useMemo(() => {
		const result = [];

		const totalsByCategory = new Map<string, number>();
		for (const { lineItem, receipt, category } of lineItemsWithReceipt) {
			const categoryName = category.name;
			if (!totalsByCategory.has(categoryName)) {
				totalsByCategory.set(categoryName, 0);
			}

			const runningTotal = totalsByCategory.get(categoryName)!;
			totalsByCategory.set(categoryName, runningTotal + Number(lineItem.quantity ?? 1) * Number(lineItem.unitPrice ?? 0.0));
		}

		for (const { receipt, category } of receipts) {
			const categoryName = category.name;
			if (!totalsByCategory.has(categoryName)) {
				totalsByCategory.set(categoryName, 0);
			}

			const runningTotal = totalsByCategory.get(categoryName)!;
			totalsByCategory.set(categoryName, runningTotal + (Number(receipt.tax ?? 0) + Number(receipt.tip ?? 0)));
		}

		for (const [key, value] of totalsByCategory.entries()) {
			result.push({ category: key, total: value });
		}

		return result;
	}, [lineItemsWithReceipt, receipts]);

	const chartConfig = {
		total: {
			label: "Total",
			color: "#2563eb",
		},
	};

	const chartColors = ["var(--color-blue-600)", "var(--color-orange-500)", "var(--color-yellow-500)", "var(--color-emerald-500)"];

	if (chartData.length === 0) {
		return null;
	}

	return (
		<ChartContainer config={chartConfig} className="h-[200px] w-full">
			<PieChart accessibilityLayer data={chartData}>
				<Pie data={chartData} dataKey={"total"} nameKey={"category"} fill="var(--color-total)">
					{chartData.map((x, i) => (
						<Cell key={i} fill={chartColors[i % chartColors.length]}></Cell>
					))}
				</Pie>
				<ChartTooltip content={<ChartTooltipContent />} />
				<Legend />
			</PieChart>
		</ChartContainer>
	);
}
