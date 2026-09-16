import { describe, expect, it } from "vitest";

import { SIGNALS, type Signal } from "../signal";
import { notDefinition } from "./not";

function computeOutput(input: Signal): Signal | undefined {
    const outputs = notDefinition.computeOutputs({
        tick: 0,
        inputs: new Map([["input", input]]),
        state: null,
        actions: [],
    });

    return outputs.get("output");
}

describe("notDefinition", () => {
    it("defines a west input and an east output", () => {
        expect(notDefinition.ports).toEqual([
            {
                id: "input",
                kind: "input",
                side: "west",
            },
            {
                id: "output",
                kind: "output",
                side: "east",
            },
        ]);
    });

    it.each([
        [SIGNALS.floating, SIGNALS.high],
        [SIGNALS.low, SIGNALS.high],
        [SIGNALS.high, SIGNALS.low],
        [SIGNALS.conflict, SIGNALS.conflict],
    ] as const)("inverts %s to %s", (input, expected) => {
        expect(computeOutput(input)).toBe(expected);
    });
});
