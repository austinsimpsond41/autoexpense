"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function SignInPage() {
	async function handleSignIn() {
		try {
			await authClient.signIn.social({ provider: "microsoft" });
		} catch (err) {
			toast.error("Sign-in failed. See console for details.");
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center w-full">
			<div className="w-full max-w-md bg-background/80 backdrop-blur-md border border-border rounded-2xl shadow-lg p-8">
				<header className="mb-6 text-center">
					<h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
					<p className="text-sm text-muted-foreground mt-1">Sign in with Microsoft to continue</p>
				</header>

				<div className="space-y-4">
					<Button onClick={handleSignIn} className="w-full" size="lg">
						Sign in with Microsoft
					</Button>
				</div>
			</div>
		</div>
	);
}
