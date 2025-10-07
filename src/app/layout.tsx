import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import SidebarNav from "@/components/layout/nav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { CollectionLoader } from "./collection-loader";
import { QueryProvider } from "@/react-query/react";
import { CheckAuth } from "./check-auth";
import type { User } from "@prisma/client";

export const metadata: Metadata = {
	title: "Data41 autoexpense",
	description: "expense reports go brrrrr",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const reqHeaders = await headers();
	const session = await auth.api.getSession({
		headers: reqHeaders,
	});
	const user = session?.user ?? null;

	return (
		<html lang="en" className={`${geist.variable}`}>
			<body>
				<CheckAuth user={user as User | null} />
				<SidebarProvider>
					<SidebarNav user={user}></SidebarNav>
					<main className="w-full">
						{user && (
							<>
								<SidebarTrigger className="m-2.5" />
								<CollectionLoader />
							</>
						)}
						<QueryProvider>{children}</QueryProvider>
					</main>
				</SidebarProvider>
			</body>
		</html>
	);
}
