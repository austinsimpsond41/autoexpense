"use client";

import type { User } from "@prisma/client";
import { redirect, usePathname } from "next/navigation";

export function CheckAuth({ user }: { user: User | null }) {
	const pathname = usePathname();

	console.log(pathname, user);
	if (user === null && pathname !== "/sign-in") {
		console.log("redirecing");
		redirect("/sign-in");
	}

	return null;
}
