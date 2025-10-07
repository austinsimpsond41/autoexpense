"use client";

import { useCallback, useState } from "react";

export type FileEntry = {
	id: string;
	file: File;
	preview?: string | null;
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function useReceiptUpload() {
	const [files, setFiles] = useState<FileEntry[]>([]);
	const [validationError, setValidationError] = useState<string | null>(null);

	const addFiles = useCallback(
		(incoming: File[]) => {
			setValidationError(null);

			const oversized = incoming.find((f) => f.size > MAX_SIZE_BYTES);
			if (oversized) {
				setValidationError(`"${oversized.name}" exceeds max size (${(MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB).`);
				return;
			}

			const allowed = incoming.filter((f) => f.type.startsWith("image/") || f.type === "application/pdf");
			if (allowed.length !== incoming.length) {
				setValidationError("Some files were skipped — only images and PDFs are allowed.");
			}

			const entries: FileEntry[] = allowed.map((f) => ({
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				file: f,
				preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
			}));

			setFiles((cur) => [...cur, ...entries]);
		},
		[files],
	);

	const removeFile = useCallback((id: string) => {
		setFiles((cur) => {
			const toRemove = cur.find((c) => c.id === id);
			if (toRemove?.preview && toRemove.preview.startsWith("blob:")) URL.revokeObjectURL(toRemove.preview);
			return cur.filter((c) => c.id !== id);
		});
	}, []);

	const moveFile = useCallback((id: string, dir: "up" | "down") => {
		setFiles((cur) => {
			const idx = cur.findIndex((c) => c.id === id);
			if (idx === -1) return cur;
			const newArr = [...cur];
			const swapIdx = dir === "up" ? idx - 1 : idx + 1;
			if (swapIdx < 0 || swapIdx >= cur.length) return cur;
			[newArr[idx], newArr[swapIdx]] = [newArr[swapIdx]!, newArr[idx]!];
			return newArr;
		});
	}, []);

	const reset = useCallback(() => {
		files.forEach((f) => {
			if (f.preview && f.preview.startsWith("blob:")) URL.revokeObjectURL(f.preview);
		});
		setFiles([]);
		setValidationError(null);
	}, [files]);

	return {
		files,
		addFiles,
		removeFile,
		moveFile,
		reset,
		validationError,
	} as const;
}
