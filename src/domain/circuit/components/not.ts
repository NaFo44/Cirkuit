import type { ComponentDefinition } from "../componentDefinition";
import { SIGNALS, type Signal } from "../signal";

const INVERTED_SIGNALS = {
    [SIGNALS.floating]: SIGNALS.floating,
    [SIGNALS.low]: SIGNALS.high,
    [SIGNALS.high]: SIGNALS.low,
    [SIGNALS.conflict]: SIGNALS.conflict,
} satisfies Record<Signal, Signal>;

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
        const input = inputs.get("input") ?? SIGNALS.floating;

        return new Map([["output", INVERTED_SIGNALS[input]]]);
    },
} satisfies ComponentDefinition;
