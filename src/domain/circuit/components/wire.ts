import type { ComponentDefinition } from "../componentDefinition";

export const wireDefinition = {
    type: "wire",

    ports: [
        { id: "north", kind: "passive", side: "north" },
        { id: "east", kind: "passive", side: "east" },
        { id: "south", kind: "passive", side: "south" },
        { id: "west", kind: "passive", side: "west" },
    ],

    conductiveGroups: [["north", "east", "south", "west"]],

    createInitialState: () => null,

    computeOutputs: () => new Map(),
} satisfies ComponentDefinition;
