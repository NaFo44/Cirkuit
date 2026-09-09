export const SIGNALS = {
    floating: "floating",
    low: "low",
    high: "high",
    conflict: "conflict",
} as const;

export type Signal = typeof SIGNALS[keyof typeof SIGNALS];