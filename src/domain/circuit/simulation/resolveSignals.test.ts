import { describe, expect, it } from "vitest";

import { SIGNALS, type Signal } from "../signal";
import { resolveSignals } from "./resolveSignals";

interface SignalResolutionCase {
    readonly name: string;
    readonly signals: readonly Signal[];
    readonly expected: Signal;
}

const cases: readonly SignalResolutionCase[] = [
    {
        name: "no drivers",
        signals: [],
        expected: SIGNALS.floating,
    },
    {
        name: "floating drivers",
        signals: [SIGNALS.floating, SIGNALS.floating],
        expected: SIGNALS.floating,
    },
    {
        name: "high driver",
        signals: [SIGNALS.high],
        expected: SIGNALS.high,
    },
    {
        name: "low driver",
        signals: [SIGNALS.low],
        expected: SIGNALS.low,
    },
    {
        name: "floating and high drivers",
        signals: [SIGNALS.floating, SIGNALS.high],
        expected: SIGNALS.high,
    },
    {
        name: "multiple equal drivers",
        signals: [SIGNALS.high, SIGNALS.high],
        expected: SIGNALS.high,
    },
    {
        name: "high and low drivers",
        signals: [SIGNALS.high, SIGNALS.low],
        expected: SIGNALS.conflict,
    },
    {
        name: "conflicting driver",
        signals: [SIGNALS.conflict],
        expected: SIGNALS.conflict,
    },
];

describe("resolveSignals", () => {
    it.each(cases)("resolves $name", ({ signals, expected }) => {
        expect(resolveSignals(signals)).toBe(expected);
    });
});
