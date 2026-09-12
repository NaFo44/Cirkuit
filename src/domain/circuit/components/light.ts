import type { ComponentDefinition } from "../componentDefinition";
import { DIRECTIONS } from "../direction";

export const lightDefinition = {
    type: "light",

    ports: DIRECTIONS.map((side) => ({
        id: side,
        kind: "input" as const,
        side,
    })),

    createInitialState: () => null,

    computeOutputs: () => new Map(),
} satisfies ComponentDefinition;
