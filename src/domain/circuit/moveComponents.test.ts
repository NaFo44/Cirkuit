import { describe, expect, it } from "vitest";

import { CircuitLayout } from "./circuitLayout";
import { canMoveComponents, moveComponents } from "./moveComponents";
import type { PlacedComponent, Rotation } from "./placedComponent";

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

function createCircuit(): CircuitLayout {
    return CircuitLayout.from({
        width: 6,
        height: 4,
        components: [
            component("source", "source", 1, 1, 90),
            component("wire", "wire", 2, 1),
            component("blocker", "light", 4, 1),
        ],
    });
}

const SELECTED_IDS = new Set(["source", "wire"]);

describe("moveComponents", () => {
    it("allows selected components to move through each other's old positions", () => {
        expect(
            canMoveComponents(createCircuit(), SELECTED_IDS, { x: 1, y: 0 }),
        ).toBe(true);
    });

    it("moves every selected component by the same offset", () => {
        const circuit = createCircuit();

        const result = moveComponents(circuit, SELECTED_IDS, {
            x: 1,
            y: 1,
        });

        if (!result) {
            throw new Error("Expected the move to succeed");
        }

        expect(result.getComponentById("source")).toEqual(
            component("source", "source", 2, 2, 90),
        );

        expect(result.getComponentById("wire")).toEqual(
            component("wire", "wire", 3, 2),
        );
    });

    it("does not mutate the original circuit", () => {
        const circuit = createCircuit();

        const result = moveComponents(circuit, SELECTED_IDS, {
            x: 1,
            y: 0,
        });

        expect(result).not.toBeNull();
        expect(result).not.toBe(circuit);

        expect(circuit.getComponentById("source")?.position).toEqual({
            x: 1,
            y: 1,
        });

        expect(circuit.getComponentById("wire")?.position).toEqual({
            x: 2,
            y: 1,
        });
    });

    it("rejects the whole move when one component would collide", () => {
        const circuit = createCircuit();

        expect(canMoveComponents(circuit, SELECTED_IDS, { x: 2, y: 0 })).toBe(
            false,
        );

        expect(
            moveComponents(circuit, SELECTED_IDS, { x: 2, y: 0 }),
        ).toBeNull();

        expect(circuit.getComponentById("source")?.position).toEqual({
            x: 1,
            y: 1,
        });
    });

    it.each([
        { description: "left", offset: { x: -2, y: 0 } },
        { description: "right", offset: { x: 4, y: 0 } },
        { description: "top", offset: { x: 0, y: -2 } },
        { description: "bottom", offset: { x: 0, y: 3 } },
    ])("rejects a move outside the $description boundary", ({ offset }) => {
        const circuit = createCircuit();

        expect(canMoveComponents(circuit, SELECTED_IDS, offset)).toBe(false);

        expect(moveComponents(circuit, SELECTED_IDS, offset)).toBeNull();
    });

    it("returns the same circuit for a zero offset", () => {
        const circuit = createCircuit();

        expect(moveComponents(circuit, SELECTED_IDS, { x: 0, y: 0 })).toBe(
            circuit,
        );
    });

    it("rejects a move when no existing component is selected", () => {
        const circuit = createCircuit();
        const unknownSelection = new Set(["missing"]);

        expect(
            canMoveComponents(circuit, unknownSelection, { x: 1, y: 0 }),
        ).toBe(false);

        expect(
            moveComponents(circuit, unknownSelection, { x: 1, y: 0 }),
        ).toBeNull();
    });
});
