import { describe, expect, it } from "vitest";

import type { EvaluationContext } from "../componentDefinition";
import { SIGNALS } from "../signal";
import { memoryDefinition, type MemoryState } from "./memory";

function context(
    state: MemoryState,
    data: (typeof SIGNALS)[keyof typeof SIGNALS],
    clock: (typeof SIGNALS)[keyof typeof SIGNALS],
): EvaluationContext {
    return {
        tick: 0,
        inputs: new Map([
            ["data", data],
            ["clock", clock],
        ]),
        state,
        actions: [],
    };
}

describe("memoryDefinition", () => {
    it("starts with a low output", () => {
        const state = memoryDefinition.createInitialState();

        expect(
            memoryDefinition
                .computeOutputs({
                    tick: 0,
                    inputs: new Map(),
                    state,
                    actions: [],
                })
                .get("output"),
        ).toBe(SIGNALS.low);
    });

    it("stores data on a rising clock edge", () => {
        const state: MemoryState = {
            value: SIGNALS.low,
            previousClock: SIGNALS.low,
        };

        const nextState = memoryDefinition.computeNextState!(
            context(state, SIGNALS.high, SIGNALS.high),
        ) as MemoryState;

        expect(nextState.value).toBe(SIGNALS.high);
        expect(nextState.previousClock).toBe(SIGNALS.high);
    });

    it("keeps its value when there is no rising edge", () => {
        const state: MemoryState = {
            value: SIGNALS.high,
            previousClock: SIGNALS.high,
        };

        const nextState = memoryDefinition.computeNextState!(
            context(state, SIGNALS.low, SIGNALS.high),
        ) as MemoryState;

        expect(nextState.value).toBe(SIGNALS.high);
    });

    it("stores a conflict present on data at the rising edge", () => {
        const state: MemoryState = {
            value: SIGNALS.low,
            previousClock: SIGNALS.low,
        };

        const nextState = memoryDefinition.computeNextState!(
            context(state, SIGNALS.conflict, SIGNALS.high),
        ) as MemoryState;

        expect(nextState.value).toBe(SIGNALS.conflict);
    });
});
