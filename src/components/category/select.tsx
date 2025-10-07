import { useLiveQuery } from "@tanstack/react-db";
import { eq, like } from "@tanstack/db";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { categoryCollection } from "@/client-db/collections";
import { Button } from "../ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

import { createId as cuid2 } from "@paralleldrive/cuid2";

type CategorySelectProps = {
	value: string;
	onValueChanged: (s: string) => void;
	children?: React.ReactNode;
};

export function CategorySelect(props: CategorySelectProps) {
	const { children } = props;

	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger>{children ?? <Button></Button>}</PopoverTrigger>
			<PopoverContent className="p-0 w-[200px]">
				<CategoryCommand
					value={props.value}
					setValue={(v) => {
						props.onValueChanged(v);
						setOpen(false);
					}}
				></CategoryCommand>
			</PopoverContent>
		</Popover>
	);
}

export function CategoryCommand(props: { value: string; setValue: (s: string) => void }) {
	const { value, setValue } = props;
	const [search, setSearch] = useState("");
	const { data: categories } = useLiveQuery(
		(q) =>
			q
				.from({ category: categoryCollection })
				.orderBy((x) => x.category.name)
				.where((x) => like(x.category.normalizedName, `%${search.toUpperCase()}%`)),
		[search],
	);

	function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			e.preventDefault();

			if (search.length === 0) {
				return;
			}

			const newCategoryId = cuid2();
			categoryCollection.insert({
				id: newCategoryId,
				name: search,
				normalizedName: search.toUpperCase(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			setValue(newCategoryId);
		}
	}

	return (
		<Command value={value} shouldFilter={false}>
			<CommandInput placeholder="Search Categories" value={search} onValueChange={setSearch} onKeyDown={handleSearchKeyDown} />
			<CommandList>
				<CommandEmpty>No categories found.</CommandEmpty>
				<CommandGroup>
					{categories.map((x) => (
						<CommandItem
							key={x.id}
							value={x.id}
							onSelect={() => {
								setValue(x.id);
							}}
						>
							<CheckIcon className={cn("mr-2 h-4 w-4", value === x.id ? "opacity-100" : "opacity-0")} />
							{x.name}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
