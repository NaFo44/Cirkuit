import { describe, expect, it } from "vitest";

import type { ComponentDefinition } from "../../domain/circuit/componentDefinition";
import { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import { defaultComponentRegistry } from "../../domain/circuit/components/defaultComponentRegistry";
import { lightDefinition } from "../../domain/circuit/components/light";
import { sourceDefinition } from "../../domain/circuit/components/source";
import { wireDefinition } from "../../domain/circuit/components/wire";
import type {
    PlacedComponent,
    Rotation,
} from "../../domain/circuit/placedComponent";
import { SIGNALS } from "../../domain/circuit/signal";
import {
    advanceSimulation,
    createSimulation,
} from "../../domain/circuit/simulation/simulationEngine";
import { createComponentVisualStates } from "./componentVisualState";

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

function simulate(
    components: readonly PlacedComponent[],
    registry: ComponentRegistry = defaultComponentRegistry,
) {
    return createSimulation(
        {
            width:
                Math.max(...components.map(({ position }) => position.x)) + 1,
            height:
                Math.max(...components.map(({ position }) => position.y)) + 1,
            components,
        },
        registry,
    );
}

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

const signalTestRegistry = new ComponentRegistry([
    sourceDefinition,
    lowSourceDefinition,
    wireDefinition,
    lightDefinition,
]);

describe("createComponentVisualStates", () => {
    it("marks a powered light as active", () => {
        const simulation = simulate([
            component("source-1", "source", 0, 0),
            component("light-1", "light", 1, 0),
        ]);

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("light-1")).toBe("active");
    });

    it("leaves an unpowered light in its default state", () => {
        const simulation = simulate([component("light-1", "light", 0, 0)]);

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("light-1")).toBe("default");
    });

    it("keeps sources in their default visual state", () => {
        const simulation = simulate([component("source-1", "source", 0, 0)]);

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("source-1")).toBe("default");
    });

    it("marks an isolated wire as floating", () => {
        const simulation = simulate([component("wire-1", "wire", 0, 0)]);

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("wire-1")).toBe(SIGNALS.floating);
    });

    it("marks a wire connected to a source as high", () => {
        const simulation = simulate([
            component("source-1", "source", 0, 0),
            component("wire-1", "wire", 1, 0),
        ]);

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("wire-1")).toBe(SIGNALS.high);
    });

    it("marks a wire connected to a low source as low", () => {
        const simulation = simulate(
            [
                component("low-source-1", "low-source", 0, 0),
                component("wire-1", "wire", 1, 0),
            ],
            signalTestRegistry,
        );

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("wire-1")).toBe(SIGNALS.low);
    });

    it("marks a wire driven high and low as conflicted", () => {
        const simulation = simulate(
            [
                component("source-1", "source", 0, 1),
                component("low-source-1", "low-source", 1, 0, 90),
                component("wire-1", "wire", 1, 1),
            ],
            signalTestRegistry,
        );

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("wire-1")).toBe(SIGNALS.conflict);
    });

    it("uses the same high visual state across connected wires", () => {
        const simulation = simulate([
            component("source-1", "source", 0, 0),
            component("wire-1", "wire", 1, 0),
            component("wire-2", "wire", 2, 0),
        ]);

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("wire-1")).toBe(SIGNALS.high);
        expect(visualStates.get("wire-2")).toBe(SIGNALS.high);
    });

    it("updates a wire visual state when a switch is toggled", () => {
        const initialSimulation = simulate([
            component("source-1", "source", 0, 0),
            component("switch-1", "switch", 1, 0),
            component("wire-1", "wire", 2, 0),
        ]);

        expect(
            createComponentVisualStates(initialSimulation).get("wire-1"),
        ).toBe(SIGNALS.floating);

        const closedSimulation = advanceSimulation(initialSimulation, [
            {
                componentId: "switch-1",
                type: "toggle",
            },
        ]);

        expect(
            createComponentVisualStates(closedSimulation).get("wire-1"),
        ).toBe(SIGNALS.high);
    });

    it("marks a light receiving conflicting signals as conflicted", () => {
        const simulation = simulate(
            [
                component("source-1", "source", 0, 1),
                component("low-source-1", "low-source", 1, 0, 90),
                component("wire-1", "wire", 1, 1),
                component("light-1", "light", 2, 1),
            ],
            signalTestRegistry,
        );

        const visualStates = createComponentVisualStates(simulation);

        expect(visualStates.get("light-1")).toBe("conflict");
        expect(visualStates.get("low-source-1")).toBe("default");
    });

    it("marks a closed switch as active", () => {
        const initialSimulation = simulate([
            component("switch-1", "switch", 0, 0),
        ]);

        expect(
            createComponentVisualStates(initialSimulation).get("switch-1"),
        ).toBe("default");

        const closedSimulation = advanceSimulation(initialSimulation, [
            {
                componentId: "switch-1",
                type: "toggle",
            },
        ]);

        expect(
            createComponentVisualStates(closedSimulation).get("switch-1"),
        ).toBe("active");
    });
});
