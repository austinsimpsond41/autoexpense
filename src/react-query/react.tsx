"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
export const getQueryClient = () => {
	if (typeof window === "undefined") {
		// Server: always make a new query client
		return createQueryClient();
	}
	// Browser: use singleton pattern to keep the same query client
	clientQueryClientSingleton ??= createQueryClient();

	return clientQueryClientSingleton;
};

export function QueryProvider(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
}
