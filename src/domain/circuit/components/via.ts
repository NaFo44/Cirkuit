import type { ComponentDefinition } from "../componentDefinition";

export const viaDefinition = {
    type: "via" as const,

    ports: [
        {
            id: "north",
            kind: "passive",
            side: "north",
            layerOffset: 0,
        },
        {
            id: "east",
            kind: "passive",
            side: "east",
            layerOffset: 0,
        },
        {
            id: "south",
            kind: "passive",
            side: "south",
            layerOffset: 0,
        },
        {
            id: "west",
            kind: "passive",
            side: "west",
            layerOffset: 0,
        },
        {
            id: "north-other",
            kind: "passive",
            side: "north",
            layerOffset: 1,
        },
        {
            id: "east-other",
            kind: "passive",
            side: "east",
            layerOffset: 1,
        },
        {
            id: "south-other",
            kind: "passive",
            side: "south",
            layerOffset: 1,
        },
        {
            id: "west-other",
            kind: "passive",
            side: "west",
            layerOffset: 1,
        },
    ],

    conductiveGroups: [
        [
            "north",
            "east",
            "south",
            "west",
            "north-other",
            "east-other",
            "south-other",
            "west-other",
        ],
    ],

    createInitialState: () => null,

    computeOutputs: () => new Map(),
} satisfies ComponentDefinition;
