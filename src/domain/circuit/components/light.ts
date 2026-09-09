import type { ComponentDefinition } from "../componentDefinition";

export const lightDefinition = {
    type: "light",

    ports: [
        {
            id: "input",
            kind: "input",
            side: "west",
        },
    ],

    createInitialState: () => null,

    computeOutputs: () => new Map(),
} satisfies ComponentDefinition;
