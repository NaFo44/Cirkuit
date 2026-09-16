import type { ComponentDefinition } from "../componentDefinition";
import { SIGNALS, toLogicSignal, type LogicSignal } from "../signal";

const INVERTED_SIGNALS = {
    [SIGNALS.low]: SIGNALS.high,
    [SIGNALS.high]: SIGNALS.low,
    [SIGNALS.conflict]: SIGNALS.conflict,
} satisfies Record<LogicSignal, LogicSignal>;

export const notDefinition = {
    type: "not" as const,

    ports: [
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
    ],

    createInitialState: () => null,

    computeOutputs: ({ inputs }) => {
        const input = toLogicSignal(inputs.get("input") ?? SIGNALS.floating);

        return new Map([["output", INVERTED_SIGNALS[input]]]);
    },
} satisfies ComponentDefinition;
