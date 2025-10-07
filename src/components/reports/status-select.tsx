import { ExpenseReportStatus, UserRole } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { authClient } from "@/lib/auth-client";
import { use } from "react";

type ExpenseReportStatusSelectProps = {
	className?: string;
	onValueChanged: (s: ExpenseReportStatus) => void;
	value: ExpenseReportStatus;
};

const SUBMITTER_OPTIONS = [
	{ value: ExpenseReportStatus.DRAFT, display: "Draft" },
	{ value: ExpenseReportStatus.SUBMITTED, display: "Submitted" },
];

const REVIEWER_OPTIONS = [
	{ value: ExpenseReportStatus.DRAFT, display: "Draft" },
	{ value: ExpenseReportStatus.SUBMITTED, display: "Submitted" },
	{ value: ExpenseReportStatus.APPROVED, display: "Approved" },
	{ value: ExpenseReportStatus.REJECTED, display: "Rejected" },
];

export function ExpenseReportStatusSelect(props: ExpenseReportStatusSelectProps) {
	const { className, onValueChanged, value } = props;
	const { data: session } = authClient.useSession();
	const optionsForRole = (session?.user as unknown as { role: UserRole })?.role === UserRole.Reviewer ? REVIEWER_OPTIONS : SUBMITTER_OPTIONS;
	return (
		<Select value={value} onValueChange={onValueChanged}>
			<SelectTrigger className={className}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{optionsForRole.map((x) => (
					<SelectItem key={x.value} value={x.value}>
						{x.display}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
