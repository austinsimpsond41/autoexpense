"use client";

import { useOutsideClick } from "@/hooks/use-outside-click";
import { useRef, useState, type HTMLAttributes, createContext, use, useEffect } from "react";

const InlineEditingContext = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>] | null>(null);

function useInlineEditingContext() {
	const context = use(InlineEditingContext);
	if (context === null) {
		throw new Error("you must call useInlineEditingContext within an InlineEditingContextProvider");
	}

	return context;
}

export function InlineEdit(props: HTMLAttributes<HTMLDivElement> & { open?: boolean; setOpen?: React.Dispatch<React.SetStateAction<boolean>> }) {
	const { open, setOpen, ...rest } = props;
	const [editing, setEditing] = useState(open ?? false);

	const containerRef = useRef<HTMLDivElement>(null);

	useOutsideClick(containerRef, () => {
		setEditing(false);
		setOpen?.(false);
	});
	return (
		<InlineEditingContext.Provider value={[open ?? editing, setOpen ?? setEditing]}>
			<div {...rest} ref={containerRef} />
		</InlineEditingContext.Provider>
	);
}

export function InlineEditTrigger(props: Omit<HTMLAttributes<HTMLDivElement>, "onClick">) {
	const [editing, setEditing] = useInlineEditingContext();

	if (editing) {
		return null;
	}

	return <div {...props} onClick={() => setEditing(true)} />;
}

export function InlineEditContent(props: Omit<HTMLAttributes<HTMLDivElement>, "onClick">) {
	const [editing, _] = useInlineEditingContext();

	if (!editing) {
		return;
	}

	return <div {...props} />;
}
