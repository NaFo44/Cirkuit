import { describe, expect, it } from "vitest";

import { SIGNALS, type Signal } from "../signal";
import { andDefinition } from "./and";

function computeOutput(inputA?: Signal, inputB?: Signal): Signal | undefined {
    const inputs = new Map<string, Signal>();

    if (inputA !== undefined) {
        inputs.set("input-a", inputA);
    }

    if (inputB !== undefined) {
        inputs.set("input-b", inputB);
    }

    const outputs = andDefinition.computeOutputs({
        tick: 0,
        inputs,
        state: null,
        actions: [],
    });

    return outputs.get("output");
}

describe("andDefinition", () => {
    it("defines two inputs and one output", () => {
        expect(andDefinition.ports).toEqual([
            {
                id: "input-a",
                kind: "input",
                side: "west",
            },
            {
                id: "input-b",
                kind: "input",
                side: "north",
            },
            {
                id: "output",
                kind: "output",
                side: "east",
            },
        ]);
    });

    it("treats missing inputs as low", () => {
        expect(computeOutput()).toBe(SIGNALS.low);
    });

    it.each<[Signal, Signal, Signal]>([
        [SIGNALS.floating, SIGNALS.floating, SIGNALS.low],
        [SIGNALS.floating, SIGNALS.low, SIGNALS.low],
        [SIGNALS.floating, SIGNALS.high, SIGNALS.low],
        [SIGNALS.floating, SIGNALS.conflict, SIGNALS.low],

        [SIGNALS.low, SIGNALS.floating, SIGNALS.low],
        [SIGNALS.low, SIGNALS.low, SIGNALS.low],
        [SIGNALS.low, SIGNALS.high, SIGNALS.low],
        [SIGNALS.low, SIGNALS.conflict, SIGNALS.low],

        [SIGNALS.high, SIGNALS.floating, SIGNALS.low],
        [SIGNALS.high, SIGNALS.low, SIGNALS.low],
        [SIGNALS.high, SIGNALS.high, SIGNALS.high],
        [SIGNALS.high, SIGNALS.conflict, SIGNALS.conflict],

        [SIGNALS.conflict, SIGNALS.floating, SIGNALS.low],
        [SIGNALS.conflict, SIGNALS.low, SIGNALS.low],
        [SIGNALS.conflict, SIGNALS.high, SIGNALS.conflict],
        [SIGNALS.conflict, SIGNALS.conflict, SIGNALS.conflict],
    ])("resolves %s AND %s to %s", (inputA, inputB, expectedOutput) => {
        expect(computeOutput(inputA, inputB)).toBe(expectedOutput);
    });
});
