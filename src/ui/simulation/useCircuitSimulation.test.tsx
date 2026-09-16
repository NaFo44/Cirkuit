import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Circuit } from "../../domain/circuit/circuit";
import type { ComponentDefinition } from "../../domain/circuit/componentDefinition";
import { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import type {
    PlacedComponent,
    Rotation,
} from "../../domain/circuit/placedComponent";
import { SIGNALS } from "../../domain/circuit/signal";
import { useCircuitSimulation } from "./useCircuitSimulation";

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

function inverter(
    id: string,
    x: number,
    y: number,
    rotation: Rotation,
): PlacedComponent {
    return {
        id,
        type: "inverter",
        position: { x, y },
        rotation,
    };
}

const unstableCircuit: Circuit = {
    width: 2,
    height: 2,
    components: [
        inverter("inverter-1", 0, 0, 270),
        inverter("inverter-2", 1, 0, 0),
        inverter("inverter-3", 1, 1, 90),
        inverter("inverter-4", 0, 1, 180),
    ],
};

interface SimulationProbeProps {
    readonly circuit: Circuit;
    readonly enabled: boolean;
}

function SimulationProbe({ circuit, enabled }: SimulationProbeProps) {
    const { simulation, error } = useCircuitSimulation(
        circuit,
        registry,
        enabled,
    );

    const status = error ? "error" : simulation ? "active" : "inactive";

    return <output data-status={status}>{error ?? "none"}</output>;
}

describe("useCircuitSimulation", () => {
    it("does not simulate an unstable circuit when disabled", () => {
        const markup = renderToStaticMarkup(
            <SimulationProbe circuit={unstableCircuit} enabled={false} />,
        );

        expect(markup).toContain('data-status="inactive"');
        expect(markup).toContain(">none</output>");
    });

    it("reports an unstable circuit when enabled", () => {
        const markup = renderToStaticMarkup(
            <SimulationProbe circuit={unstableCircuit} enabled />,
        );

        expect(markup).toContain('data-status="error"');
        expect(markup).toContain("Circuit did not stabilize at tick 0");
    });

    it("starts a valid circuit when enabled", () => {
        const validCircuit: Circuit = {
            width: 1,
            height: 1,
            components: [],
        };

        const markup = renderToStaticMarkup(
            <SimulationProbe circuit={validCircuit} enabled />,
        );

        expect(markup).toContain('data-status="active"');
        expect(markup).toContain(">none</output>");
    });
});
