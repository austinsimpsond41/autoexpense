import { useCallback, useRef } from "react"

type AnyFunction = (...args: any[]) => any

export function useDebouncedFunction<T extends AnyFunction>(opts: { delay: number, callback: T}) {
    const { delay, callback } = opts

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args)
            timeoutRef.current = null
        }, delay)


    }, [callback, timeoutRef])
}