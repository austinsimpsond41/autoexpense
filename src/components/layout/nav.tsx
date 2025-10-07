"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	SidebarProvider,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FileTextIcon, UserIcon, LogOutIcon, PanelLeftIcon, PlusIcon, User2Icon, ChevronUpIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ExpenseReportStatus, type ExpenseReport } from "@prisma/client";

import { createId as cuid2 } from "@paralleldrive/cuid2";
import { reportCollection } from "@/client-db/collections";

export type User = (typeof authClient.$Infer.Session)["user"];

type SidebarNavProps = {
	user: User | null;
};

export default function SidebarNav(props: SidebarNavProps) {
	const { user } = props;

	const pathname = usePathname();
	const router = useRouter();

	async function handleSignOut() {
		try {
			await authClient.signOut();
			router.push("/sign-in");
		} catch (err) {
			toast.error("Sign out failed");
		}
	}

	if (!user) {
		return null;
	}

	function createNewReport() {
		if (!user) {
			return;
		}

		const report: ExpenseReport = {
			title: "Untitled Expense Report",
			description: "Untitled Expense Report",
			id: cuid2(),
			createdAt: new Date(),
			updatedAt: new Date(),
			userId: user.id,
			status: ExpenseReportStatus.DRAFT,
		};

		reportCollection.insert(report);
		router.push(`/reports/${report.id}`);
	}

	return (
		<Sidebar side="left" variant="sidebar" collapsible="icon" className="z-20">
			<SidebarContent>
				<SidebarMenu>
					<SidebarGroup>
						<SidebarGroupLabel>Reports</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={pathname === "/reports"}>
									<Link href="/reports" className="flex w-full items-center gap-2">
										<FileTextIcon className="size-4" />
										<span>List</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton onClick={createNewReport} isActive={pathname?.startsWith("/reports/new")}>
									<PlusIcon className="size-4" />
									<span>New</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarMenu>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton>
									<Avatar className="size-4">
										<AvatarFallback>
											{user.name
												.split(" ")
												.map((x) => x[0])
												.join("")}
										</AvatarFallback>
										{user.image && <AvatarImage src={user.image}></AvatarImage>}
									</Avatar>
									<span className="overflow-x-hidden text-nowrap text-ellipsis">{user.name}</span>
									<ChevronUpIcon className="ml-auto size-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-[--radix-popper-anchor-width]">
								<DropdownMenuItem onSelect={() => handleSignOut()}>
									<span>Sign out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
