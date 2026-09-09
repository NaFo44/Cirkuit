import type {
    ComponentDefinition,
} from "../componentDefinition";

export const sourceDefinition = {
    type: "source",
    ports: [
        {
            id: "output",
            kind: "output",
            side: "east",
        },
    ],

    createInitialState: () => null,

    computeOutputs: () => new Map([["output", "high"]])
} satisfies ComponentDefinition;