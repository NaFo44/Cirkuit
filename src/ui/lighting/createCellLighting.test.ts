import { describe, expect, it } from "vitest";

import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import type { ComponentVisualState } from "../components/componentVisualState";
import { createCellLighting } from "./createCellLighting";

function component(
    id: string,
    type: string,
    x: number,
    y: number,
): PlacedComponent {
    return {
        id,
        type,
        position: { x, y },
        rotation: 0,
    };
}

function lightingFor(
    components: readonly PlacedComponent[],
    visualStates: ReadonlyMap<string, ComponentVisualState>,
) {
    let circuit = CircuitLayout.empty(7, 7);

    for (const currentComponent of components) {
        circuit = circuit.withComponent(currentComponent);
    }

    return createCellLighting(circuit, visualStates);
}

describe("createCellLighting", () => {
    it("creates discrete light levels around an active light", () => {
        const lighting = lightingFor(
            [component("light-1", "light", 3, 3)],
            new Map([["light-1", "active"]]),
        );

        expect(lighting).toContainEqual({
            position: { x: 3, y: 2 },
            level: 3,
        });
        expect(lighting).toContainEqual({
            position: { x: 4, y: 4 },
            level: 2,
        });
        expect(lighting).toContainEqual({
            position: { x: 3, y: 6 },
            level: 1,
        });
        expect(lighting).not.toContainEqual({
            position: { x: 3, y: 3 },
            level: expect.any(Number),
        });
    });

    it("ignores inactive lights and other active components", () => {
        const lighting = lightingFor(
            [
                component("light-1", "light", 2, 2),
                component("switch-1", "switch", 4, 4),
            ],
            new Map([
                ["light-1", "default"],
                ["switch-1", "active"],
            ]),
        );

        expect(lighting).toEqual([]);
    });

    it("keeps lighting inside the circuit", () => {
        const lighting = lightingFor(
            [component("light-1", "light", 0, 0)],
            new Map([["light-1", "active"]]),
        );

        expect(
            lighting.every(
                ({ position }) => position.x >= 0 && position.y >= 0,
            ),
        ).toBe(true);
    });

    it("keeps the strongest level where two lights overlap", () => {
        const lighting = lightingFor(
            [
                component("light-2", "light", 5, 3),
                component("light-1", "light", 1, 3),
            ],
            new Map([
                ["light-1", "active"],
                ["light-2", "active"],
            ]),
        );

        expect(lighting).toContainEqual({
            position: { x: 2, y: 3 },
            level: 3,
        });
    });
});
