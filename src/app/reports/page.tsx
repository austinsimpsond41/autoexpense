"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { receiptCollection, reportCollection } from "@/client-db/collections";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExpenseReport } from "@prisma/client";
import { useReportDateRange } from "@/hooks/use-report-date-range";

function parseIntOr(v: string | null, defaultN: number) {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaultN;
}

function buildUrl(page: number, pageSize: number) {
	const qs = new URLSearchParams();
	qs.set("page", String(page));
	qs.set("pageSize", String(pageSize));
	return `/reports?${qs.toString()}`;
}

export default function ReportsPage() {
	const searchParams = useSearchParams();
	const pageParam = searchParams?.get("page");
	const pageSizeParam = searchParams?.get("pageSize");

	const page = parseIntOr(pageParam, 1);
	const pageSize = parseIntOr(pageSizeParam, 10);
	const [rerenderFlag, rerender] = useState(false);

	const { data: reports } = useLiveQuery(
		(q) =>
			q
				.from({ reports: reportCollection })
				.orderBy((q) => q.reports.updatedAt, { direction: "desc" })
				.offset((page - 1) * pageSize)
				.limit(pageSize),
		[pageSize, page, rerenderFlag],
	);

	const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));
	return (
		<main className="max-w-7xl mx-auto p-6">
			<h1 className="text-2xl font-semibold mb-4">Expense Reports</h1>

			<div className="border border-border rounded"></div>
			<ReportsTable>
				{reports.map((x) => (
					<ReportsTableRow key={x.id} report={x} onDeleted={() => rerender((r) => !r)}></ReportsTableRow>
				))}
			</ReportsTable>

			<div className="flex items-center justify-between gap-4 mt-4">
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Page size:</span>
					{[5, 10, 20, 50].map((s) => (
						<Link key={s} href={buildUrl(1, s)} className={`px-2 py-1 rounded text-sm ${s === pageSize ? "bg-muted/70 font-medium" : "hover:bg-muted/20"}`}>
							{s}
						</Link>
					))}
				</div>

				<div className="flex items-center gap-2">
					<Link
						href={buildUrl(Math.max(1, page - 1), pageSize)}
						className={`px-3 py-1 rounded border ${page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-muted/20"}`}
					>
						Previous
					</Link>

					<span className="text-sm">
						Page <strong>{page}</strong> of {totalPages}
					</span>

					<Link
						href={buildUrl(Math.min(totalPages, page + 1), pageSize)}
						className={`px-3 py-1 rounded border ${page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-muted/20"}`}
					>
						Next
					</Link>
				</div>
			</div>
		</main>
	);
}

type ReportsTableProps = {
	children: React.ReactNode;
};

function ReportsTable(props: ReportsTableProps) {
	const { children } = props;

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Title</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Dates</TableHead>
					<TableHead>Created</TableHead>
					<TableHead></TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>{children}</TableBody>
		</Table>
	);
}

type ReportsTableRowProps = {
	report: ExpenseReport;
	onDeleted: () => void;
};

function ReportsTableRow(props: ReportsTableRowProps) {
	const { report } = props;
	const [start, end] = useReportDateRange(report.id);
	return (
		<TableRow>
			<TableCell>
				<Link href={`/reports/${report.id}`} className="text-primary underline">
					{report.title ?? "Untitled"}
				</Link>
			</TableCell>
			<TableCell className="capitalize">{report.status.toLowerCase() ?? "-"}</TableCell>
			<TableCell>{start === null && end === null ? "-" : `${start?.toLocaleDateString() ?? "-"} → ${end?.toLocaleDateString() ?? "-"}`}</TableCell>
			<TableCell>{report.createdAt.toLocaleDateString()}</TableCell>
			<TableCell>
				<Button
					className="size-8 p-0"
					variant="ghost"
					onClick={() => {
						reportCollection.delete(report.id);
						props.onDeleted();
					}}
				>
					<TrashIcon className="size-4 text-destructive" />
				</Button>
			</TableCell>
		</TableRow>
	);
}
