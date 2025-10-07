"use client";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { format, isValid, parse, isMatch } from "date-fns";
import { cn } from "@/lib/utils";
import { type ClassValue } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "./input";
import { type OnSelectHandler, type SelectSingleEventHandler } from "react-day-picker";

import { Calendar } from "./calendar";

type DatePickerProps = {
	disabled?: boolean;
	targetClassName?: ClassValue;
	inputClassName?: ClassValue;
	defaultValue?: Date;
	onValueChange: (d?: Date) => void;
	placeholder?: string;
};

export function DatePicker(props: DatePickerProps) {
	const allowedFormats = ["MM/dd/yy", "MM/dd/yyyy"] as const;
	const defaultFormat = allowedFormats[1];

	const { targetClassName, inputClassName, defaultValue, onValueChange, placeholder, disabled = false } = props;
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState(defaultValue ? format(defaultValue, defaultFormat) : "");
	const [month, setMonth] = useState(new Date());

	useEffect(() => {
		if (defaultValue) {
			setInputValue(format(defaultValue, defaultFormat));
			setMonth(defaultValue);
		}
	}, [defaultValue]);

	const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const dateStr = e.target.value;
		setInputValue(e.currentTarget.value);
		let date: Date | undefined = undefined;
		for (const format of allowedFormats) {
			if (!isMatch(e.currentTarget.value, format)) {
				continue;
			}

			date = parse(dateStr, format, new Date());
			break;
		}

		if (date && isValid(date)) {
			onValueChange(date);
			setMonth(date);
		} else {
			onValueChange(undefined);
			setMonth(new Date());
		}
	};

	const handleSelectDate: OnSelectHandler<Date> = useCallback(
		(_, selected) => {
			onValueChange(selected);
			if (selected) {
				setOpen(false);
				setMonth(selected);
				setInputValue(format(selected, defaultFormat));
			} else {
				setInputValue("");
			}
		},
		[onValueChange],
	);

	const dateInputRef = useRef<HTMLInputElement>(null);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				disabled={disabled}
				className={cn(targetClassName)}
				tabIndex={-1}
				onClick={(e) => {
					if (open) {
						e.preventDefault();
					}
				}}
			>
				<Input
					disabled={disabled}
					className={cn(inputClassName)}
					ref={dateInputRef}
					placeholder={placeholder ?? "MM/DD/YYYY"}
					value={inputValue}
					onChange={handleInputChange}
					onFocus={() => setOpen(true)}
				/>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-0"
				align="start"
				autoFocus={false}
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					dateInputRef.current?.focus({});
					console.log(dateInputRef.current);
				}}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<Calendar mode="single" required month={month ?? defaultValue} selected={defaultValue} onMonthChange={setMonth} onSelect={handleSelectDate} />
			</PopoverContent>
		</Popover>
	);
}
