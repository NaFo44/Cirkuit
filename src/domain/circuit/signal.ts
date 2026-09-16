export const SIGNALS = {
    floating: "floating",
    low: "low",
    high: "high",
    conflict: "conflict",
} as const;

export type Signal = (typeof SIGNALS)[keyof typeof SIGNALS];

export type LogicSignal = Exclude<Signal, typeof SIGNALS.floating>;

export function toLogicSignal(signal: Signal): LogicSignal {
    return signal === SIGNALS.floating ? SIGNALS.low : signal;
}
