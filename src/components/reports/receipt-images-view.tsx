"use client";

import type { Receipt } from "@prisma/client";
import { useState } from "react";
import { Button } from "../ui/button";
import { MoveLeftIcon, MoveRightIcon } from "lucide-react";

export function ReceiptImageView(props: { receiptId: string; pageCount: number }) {
	const { receiptId, pageCount } = props;
	const [currentPage, setCurrentPage] = useState(1);

	const currentUrl = `/api/receipt/file?id=${receiptId}&page=${currentPage}`;
	return (
		<div className="relative">
			<img src={currentUrl} alt={"receipt"} className="w-full h-full object-cover rounded-3xl" />
			{pageCount > 1 && (
				<div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
					<Button disabled={currentPage === 1} className="size-8 p-0 rounded-full" variant={"outline"} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}>
						<MoveLeftIcon className="size-4" />
					</Button>
					<div className="w-4 text-center pointer-events-none">{currentPage}</div>
					<Button
						disabled={currentPage === pageCount}
						className="size-8 p-0 rounded-full"
						variant={"outline"}
						onClick={() => setCurrentPage((p) => Math.min(p + 1, pageCount))}
					>
						<MoveRightIcon className="size-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
