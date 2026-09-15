import { describe, expect, it } from "vitest";

import type { Circuit } from "../circuit";
import type { ComponentDefinition } from "../componentDefinition";
import { ComponentRegistry } from "../componentRegistry";
import { defaultComponentRegistry } from "../components/defaultComponentRegistry";
import { lightDefinition } from "../components/light";
import { sourceDefinition } from "../components/source";
import { wireDefinition } from "../components/wire";
import type { PlacedComponent, Rotation } from "../placedComponent";
import { SIGNALS } from "../signal";
import {
    advanceSimulation,
    createSimulation,
    getPortSignal,
    getSimulationComponentState,
} from "./simulationEngine";

function component(
    id: string,
    type: string,
    x: number,
    y: number,
    rotation: Rotation = 0,
): PlacedComponent {
    return {
        id,
        type,
        position: { x, y },
        rotation,
    };
}

describe("simulationEngine", () => {
    it("powers a light directly connected to a source", () => {
        const circuit: Circuit = {
            width: 2,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("light-1", "light", 1, 0),
            ],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(getPortSignal(simulation, "light-1", "west")).toBe(SIGNALS.high);
    });

    it("powers a light through a wire", () => {
        const circuit: Circuit = {
            width: 3,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("wire-1", "wire", 1, 0),
                component("light-1", "light", 2, 0),
            ],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(getPortSignal(simulation, "light-1", "west")).toBe(SIGNALS.high);
    });

    it("powers a light through a vertical wire", () => {
        const circuit: Circuit = {
            width: 1,
            height: 3,
            components: [
                component("source-1", "source", 0, 0),
                component("wire-1", "wire", 0, 1),
                component("light-1", "light", 0, 2),
            ],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(getPortSignal(simulation, "light-1", "north")).toBe(
            SIGNALS.high,
        );
    });

    it("leaves a light floating without a source", () => {
        const circuit: Circuit = {
            width: 2,
            height: 1,
            components: [
                component("wire-1", "wire", 0, 0),
                component("light-1", "light", 1, 0),
            ],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(getPortSignal(simulation, "light-1", "west")).toBe(
            SIGNALS.floating,
        );
    });

    it("settles a chain of combinational components", () => {
        const bufferDefinition = {
            type: "buffer",

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

            computeOutputs: ({ inputs }) =>
                new Map([["output", inputs.get("input") ?? SIGNALS.floating]]),
        } satisfies ComponentDefinition;

        const registry = new ComponentRegistry([
            sourceDefinition,
            bufferDefinition,
            lightDefinition,
        ]);

        const circuit: Circuit = {
            width: 3,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("buffer-1", "buffer", 1, 0),
                component("light-1", "light", 2, 0),
            ],
        };

        const simulation = createSimulation(circuit, registry);

        expect(getPortSignal(simulation, "light-1", "west")).toBe(SIGNALS.high);
    });

    it("reports conflicts between high and low drivers", () => {
        const lowSourceDefinition = {
            type: "low-source",

            ports: [
                {
                    id: "output",
                    kind: "output",
                    side: "east",
                },
            ],

            createInitialState: () => null,

            computeOutputs: () => new Map([["output", SIGNALS.low]]),
        } satisfies ComponentDefinition;

        const registry = new ComponentRegistry([
            sourceDefinition,
            lowSourceDefinition,
            wireDefinition,
            lightDefinition,
        ]);

        const circuit: Circuit = {
            width: 3,
            height: 2,
            components: [
                component("source-1", "source", 0, 1),
                component("low-source-1", "low-source", 1, 0, 90),
                component("wire-1", "wire", 1, 1),
                component("light-1", "light", 2, 1),
            ],
        };

        const simulation = createSimulation(circuit, registry);

        expect(getPortSignal(simulation, "light-1", "west")).toBe(
            SIGNALS.conflict,
        );
    });

    it("updates component states atomically on each tick", () => {
        const toggleDefinition = {
            type: "toggle",

            ports: [
                {
                    id: "output",
                    kind: "output",
                    side: "east",
                },
            ],

            createInitialState: () => false,

            computeOutputs: ({ state }) =>
                new Map([
                    ["output", state === true ? SIGNALS.high : SIGNALS.low],
                ]),
            computeNextState: ({ state }) => state !== true,
        } satisfies ComponentDefinition;

        const registry = new ComponentRegistry([
            toggleDefinition,
            lightDefinition,
        ]);

        const circuit: Circuit = {
            width: 2,
            height: 1,
            components: [
                component("toggle-1", "toggle", 0, 0),
                component("light-1", "light", 1, 0),
            ],
        };

        const initialSimulation = createSimulation(circuit, registry);
        const nextSimulation = advanceSimulation(initialSimulation);

        expect(initialSimulation.snapshot.tick).toBe(0);
        expect(getPortSignal(initialSimulation, "light-1", "west")).toBe(
            SIGNALS.low,
        );

        expect(nextSimulation.snapshot.tick).toBe(1);
        expect(getPortSignal(nextSimulation, "light-1", "west")).toBe(
            SIGNALS.high,
        );

        expect(getPortSignal(initialSimulation, "light-1", "west")).toBe(
            SIGNALS.low,
        );
    });

    it("rejects unstable combinational loops", () => {
        const inverterDefinition = {
            type: "inverter",

            ports: [
                {
                    id: "input",
                    kind: "input",
                    side: "west",
                },
                {
                    id: "output",
                    kind: "output",
                    side: "south",
                },
            ],

            createInitialState: () => null,

            computeOutputs: ({ inputs }) =>
                new Map([
                    [
                        "output",
                        inputs.get("input") === SIGNALS.high
                            ? SIGNALS.low
                            : SIGNALS.high,
                    ],
                ]),
        } satisfies ComponentDefinition;

        const registry = new ComponentRegistry([inverterDefinition]);

        const circuit: Circuit = {
            width: 2,
            height: 2,
            components: [
                component("inverter-1", "inverter", 0, 0, 270),
                component("inverter-2", "inverter", 1, 0),
                component("inverter-3", "inverter", 1, 1, 90),
                component("inverter-4", "inverter", 0, 1, 180),
            ],
        };

        expect(() => createSimulation(circuit, registry)).toThrow(
            "Circuit did not stabilize at tick 0",
        );
    });

    it("opens and closes a switch through simulation actions", () => {
        const circuit: Circuit = {
            width: 3,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("switch-1", "switch", 1, 0),
                component("light-1", "light", 2, 0),
            ],
        };

        const initialSimulation = createSimulation(
            circuit,
            defaultComponentRegistry,
        );

        expect(
            getSimulationComponentState(initialSimulation, "switch-1"),
        ).toEqual({
            closed: false,
        });

        expect(getPortSignal(initialSimulation, "light-1", "west")).toBe(
            SIGNALS.floating,
        );

        const closedSimulation = advanceSimulation(initialSimulation, [
            {
                componentId: "switch-1",
                type: "toggle",
            },
        ]);

        expect(closedSimulation.snapshot.tick).toBe(1);
        expect(
            getSimulationComponentState(closedSimulation, "switch-1"),
        ).toEqual({
            closed: true,
        });
        expect(getPortSignal(closedSimulation, "light-1", "west")).toBe(
            SIGNALS.high,
        );

        const reopenedSimulation = advanceSimulation(closedSimulation, [
            {
                componentId: "switch-1",
                type: "toggle",
            },
        ]);

        expect(reopenedSimulation.snapshot.tick).toBe(2);
        expect(
            getSimulationComponentState(reopenedSimulation, "switch-1"),
        ).toEqual({
            closed: false,
        });
        expect(getPortSignal(reopenedSimulation, "light-1", "west")).toBe(
            SIGNALS.floating,
        );

        expect(
            getSimulationComponentState(initialSimulation, "switch-1"),
        ).toEqual({
            closed: false,
        });
    });

    it("uses a closed switch as an omnidirectional junction", () => {
        const circuit: Circuit = {
            width: 3,
            height: 3,
            components: [
                component("source-1", "source", 0, 1),
                component("switch-1", "switch", 1, 1),
                component("light-north", "light", 1, 0),
                component("light-east", "light", 2, 1),
                component("light-south", "light", 1, 2),
            ],
        };

        const initialSimulation = createSimulation(
            circuit,
            defaultComponentRegistry,
        );

        const closedSimulation = advanceSimulation(initialSimulation, [
            {
                componentId: "switch-1",
                type: "toggle",
            },
        ]);

        expect(getPortSignal(closedSimulation, "light-north", "south")).toBe(
            SIGNALS.high,
        );
        expect(getPortSignal(closedSimulation, "light-east", "west")).toBe(
            SIGNALS.high,
        );
        expect(getPortSignal(closedSimulation, "light-south", "north")).toBe(
            SIGNALS.high,
        );
    });

    it("rejects actions targeting an unknown component", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [component("switch-1", "switch", 0, 0)],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(() =>
            advanceSimulation(simulation, [
                {
                    componentId: "missing",
                    type: "toggle",
                },
            ]),
        ).toThrow("Unknown simulation action target: missing");
    });

    it("rejects simulation actions with an empty type", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [component("switch-1", "switch", 0, 0)],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(() =>
            advanceSimulation(simulation, [
                {
                    componentId: "switch-1",
                    type: " ",
                },
            ]),
        ).toThrow("Simulation action type cannot be empty");
    });

    it("applies multiple switch toggles atomically", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [component("switch-1", "switch", 0, 0)],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        const nextSimulation = advanceSimulation(simulation, [
            {
                componentId: "switch-1",
                type: "toggle",
            },
            {
                componentId: "switch-1",
                type: "toggle",
            },
        ]);

        expect(nextSimulation.snapshot.tick).toBe(1);
        expect(getSimulationComponentState(nextSimulation, "switch-1")).toEqual(
            {
                closed: false,
            },
        );
    });

    it("settles two consecutive NOT gates", () => {
        const circuit: Circuit = {
            width: 4,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("not-1", "not", 1, 0),
                component("not-2", "not", 2, 0),
                component("light-1", "light", 3, 0),
            ],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(getPortSignal(simulation, "not-1", "output")).toBe(SIGNALS.low);
        expect(getPortSignal(simulation, "not-2", "output")).toBe(SIGNALS.high);
        expect(getPortSignal(simulation, "light-1", "west")).toBe(SIGNALS.high);
    });

    it("keeps a NOT output floating when its input is floating", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [component("not-1", "not", 0, 0)],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(getPortSignal(simulation, "not-1", "output")).toBe(
            SIGNALS.floating,
        );
    });

    it("connects a rotated NOT gate vertically", () => {
        const circuit: Circuit = {
            width: 1,
            height: 3,
            components: [
                component("source-1", "source", 0, 0),
                component("not-1", "not", 0, 1, 90),
                component("light-1", "light", 0, 2),
            ],
        };

        const simulation = createSimulation(circuit, defaultComponentRegistry);

        expect(getPortSignal(simulation, "not-1", "input")).toBe(SIGNALS.high);
        expect(getPortSignal(simulation, "not-1", "output")).toBe(SIGNALS.low);
        expect(getPortSignal(simulation, "light-1", "north")).toBe(SIGNALS.low);
    });
});
