"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import type { FileEntry } from "@/hooks/use-receipt-upload";

export default function FileList({
	files,
	onRemove,
	onMove,
}: {
	files: FileEntry[];
	onRemove: (id: string) => void;
	onMove: (id: string, dir: "up" | "down") => void;
}) {
	if (files.length === 0) {
		return <div className="text-sm text-muted-foreground">No files yet.</div>;
	}

	return (
		<div className="space-y-2">
			{files.map((f, idx) => {
				const src = f.preview ?? undefined;
				const isPdf = f.file.type === "application/pdf";

				return (
					<div key={f.id} className="flex items-center gap-3 p-2 border rounded">
						<div className="w-16 h-12 bg-slate-50 flex items-center justify-center rounded overflow-hidden">
							{isPdf ? <div className="text-sm font-medium">PDF</div> : <img src={src} alt={f.file.name} className="w-full h-full object-cover" />}
						</div>

						<div className="flex-1 min-w-0">
							<div className="font-medium truncate">{f.file.name}</div>
							<div className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(1)} KB</div>
						</div>

						<div className="flex gap-2">
							<Button size="sm" variant="ghost" onClick={() => onMove(f.id, "up")} disabled={idx === 0}>
								↑
							</Button>
							<Button size="sm" variant="ghost" onClick={() => onMove(f.id, "down")} disabled={idx === files.length - 1}>
								↓
							</Button>
							<Button size="sm" variant="destructive" onClick={() => onRemove(f.id)}>
								Remove
							</Button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
