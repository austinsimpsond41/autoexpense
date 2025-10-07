import { receiptCollection } from "@/client-db/collections";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

export function useReportDateRange(reportId: string) {
    const {data: receipts }= useLiveQuery(q => q.from({receipt: receiptCollection}).where(({receipt}) => eq(receipt.expenseReportId, reportId)))

    const range = useMemo(() => {
        const receiptDates = receipts.filter((x) => x !== undefined && x.date !== null).map((x) => x.date!);
        if (receiptDates.length === 0) {
            return [undefined, undefined];
        }
        const startDate = receiptDates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
        const endDate = receiptDates.reduce((a, b) => (a.getTime() < b.getTime() ? b : a));

        return [startDate, endDate];
    }, [receipts]);

    return range

}