import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
	const user = await auth.api.getSession({
		headers: await headers(),
	});

	if (!user) {
		redirect("/sign-in");
	} else {
		redirect("/reports");
	}

	return null;
}
