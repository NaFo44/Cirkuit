import type { ComponentDefinition } from "../componentDefinition";
import { SIGNALS, toLogicSignal, type LogicSignal } from "../signal";

const AND_PORT_IDS = {
    inputA: "input-a",
    inputB: "input-b",
    output: "output",
} as const;

function computeAndOutput(
    inputA: LogicSignal,
    inputB: LogicSignal,
): LogicSignal {
    if (inputA === SIGNALS.low || inputB === SIGNALS.low) {
        return SIGNALS.low;
    }

    if (inputA === SIGNALS.conflict || inputB === SIGNALS.conflict) {
        return SIGNALS.conflict;
    }

    return SIGNALS.high;
}

export const andDefinition = {
    type: "and" as const,

    ports: [
        {
            id: AND_PORT_IDS.inputA,
            kind: "input",
            side: "west",
        },
        {
            id: AND_PORT_IDS.inputB,
            kind: "input",
            side: "north",
        },
        {
            id: AND_PORT_IDS.output,
            kind: "output",
            side: "east",
        },
    ],

    createInitialState: () => null,

    computeOutputs: ({ inputs }) => {
        const inputA = toLogicSignal(
            inputs.get(AND_PORT_IDS.inputA) ?? SIGNALS.floating,
        );
        const inputB = toLogicSignal(
            inputs.get(AND_PORT_IDS.inputB) ?? SIGNALS.floating,
        );

        return new Map([
            [AND_PORT_IDS.output, computeAndOutput(inputA, inputB)],
        ]);
    },
} satisfies ComponentDefinition;
