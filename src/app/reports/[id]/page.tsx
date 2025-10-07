"use client";

import React, { use } from "react";
import UploadForm from "@/components/reports/upload-form";
import type { UploadExpenseReportFormData } from "@/lib/schemas/report-upload";
import type { DeepPartial } from "@/lib/types/deep-partial";

import { reportCollection } from "@/client-db/collections";

import { createLiveQueryCollection, eq } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";

type ViewReportPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default function ViewReportPage(props: ViewReportPageProps) {
	const { params: paramsPromise } = props;
	const { id } = use(paramsPromise);

	const { data: reports } = useLiveQuery((q) => q.from({ report: reportCollection }).where(({ report }) => eq(report.id, id)), [id]);
	const report = reports[0]!;

	function handleValueChanged(v: DeepPartial<UploadExpenseReportFormData>) {
		reportCollection.update(v.id, (x) => {
			x.description = v.description ?? "";
			x.title = v.title ?? "";
			if (v.status) {
				x.status = v.status;
			}
		});
	}

	if (!report) {
		return null;
	}

	return (
		<main className="max-w-7xl mx-auto p-6 pb-[50vh]">
			<h1 className="text-2xl font-semibold mb-2">Manage Expense Report: {report?.title}</h1>
			<p className="text-sm text-muted-foreground mb-6">Upload one or many receipts and group them into an expense report.</p>

			<UploadForm initialData={report} valueChanged={handleValueChanged} />
			{/* {JSON.stringify(report)} */}
		</main>
	);
}
