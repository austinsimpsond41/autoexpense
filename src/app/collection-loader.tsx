"use client";

import { categoryCollection, merchantCollection, receiptCollection, receiptLineItemCollection, reportCollection } from "@/client-db/collections";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { useEffect, useState } from "react";

const COLLECTIONS_TO_PRELOAD = [reportCollection, receiptCollection, receiptLineItemCollection, merchantCollection, categoryCollection];
export function CollectionLoader() {
	const [totalLoaded, setTotalLoaded] = useState(0);

	useEffect(() => {
		setTotalLoaded(0);
		async function preloadCollections() {
			await Promise.allSettled(
				COLLECTIONS_TO_PRELOAD.map(async (x) => {
					await x.preload();
					setTotalLoaded((l) => l + 1);
				}),
			);
		}
		preloadCollections();
	}, []);

	if (totalLoaded === COLLECTIONS_TO_PRELOAD.length) {
		return null;
	}
	return (
		<div className="absolute inset-0 z-20 bg-background justify-center items-center flex flex-col">
			<div className="text-center flex items-center justify-center flex-col">
				<Image className="size-24 w-fit mb-8" alt="data41 logo" src="/logo.png" width={128} height={128} />
				<h1 className="text-2xl font-semibold mb-2">Loading Application</h1>
				<p className="text-muted-foreground mb-6">We're getting your data ready for you. Hold on tight...</p>
				<Progress className="mb-4" value={(totalLoaded / COLLECTIONS_TO_PRELOAD.length) * 100}></Progress>
				<span className="text-muted-foreground">{((totalLoaded / COLLECTIONS_TO_PRELOAD.length) * 100).toFixed(0)}%</span>
			</div>
		</div>
	);
}
