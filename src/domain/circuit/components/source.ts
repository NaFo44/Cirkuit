import type { ComponentDefinition } from "../componentDefinition";
import { DIRECTIONS } from "../direction";
import { SIGNALS } from "../signal";

export const sourceDefinition = {
    type: "source" as const,
    ports: DIRECTIONS.map((side) => ({
        id: side,
        kind: "output" as const,
        side,
    })),

    createInitialState: () => null,

    computeOutputs: () =>
        new Map(DIRECTIONS.map((side) => [side, SIGNALS.high] as const)),
} satisfies ComponentDefinition;
