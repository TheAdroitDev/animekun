import { useEffect, useState } from "react";

export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        try {
            const storedValue = window.localStorage.getItem(key);

            if (storedValue !== null) {
                setValue(JSON.parse(storedValue));
            }
        } catch {
            console.error(`Failed to read localStorage key "${key}"`);
        }
    }, [key]);

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            console.error(`Failed to save localStorage key "${key}"`);
        }
    }, [key, value]);

    return [value, setValue];
}