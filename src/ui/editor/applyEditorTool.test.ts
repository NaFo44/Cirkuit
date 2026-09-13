import { describe, expect, it } from "vitest";

import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type {
    PlacedComponent,
    Rotation,
} from "../../domain/circuit/placedComponent";
import { applyEditorTool } from "./applyEditorTool";
import type { EditorTool } from "./editorTool";

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

describe("applyEditorTool", () => {
    it("erases the component at the selected position", () => {
        const source = component("source-1", "source", 0, 0);
        const light = component("light-1", "light", 1, 0);

        const circuit = CircuitLayout.empty(2, 1)
            .withComponent(source)
            .withComponent(light);

        const tool: EditorTool = {
            kind: "eraser",
        };

        const updated = applyEditorTool(circuit, tool, { x: 0, y: 0 });

        expect(updated).not.toBe(circuit);
        expect(updated.getComponentAt({ x: 0, y: 0 })).toBeUndefined();
        expect(updated.getComponentAt({ x: 1, y: 0 })).toBe(light);

        expect(circuit.getComponentAt({ x: 0, y: 0 })).toBe(source);
    });

    it("returns the same circuit when erasing an empty position", () => {
        const circuit = CircuitLayout.empty(2, 2);

        const updated = applyEditorTool(
            circuit,
            { kind: "eraser" },
            { x: 1, y: 1 },
        );

        expect(updated).toBe(circuit);
    });

    it("placed the selected component", () => {
        const circuit = CircuitLayout.empty(2, 2);

        const tool: EditorTool = {
            kind: "component",
            componentType: "source",
            rotation: 90,
        };

        const updated = applyEditorTool(circuit, tool, { x: 1, y: 0 });

        expect(updated.getComponentAt({ x: 1, y: 0 })).toMatchObject({
            type: "source",
            position: {
                x: 1,
                y: 0,
            },
            rotation: 90,
        });

        expect(circuit.getComponentAt({ x: 1, y: 0 })).toBeUndefined();
    });

    it("returns the same circuit when the component already matches", () => {
        const source = component("source-1", "source", 1, 0, 90);

        const circuit = CircuitLayout.empty(2, 1).withComponent(source);

        const tool: EditorTool = {
            kind: "component",
            componentType: "source",
            rotation: 90,
        };

        const updated = applyEditorTool(circuit, tool, { x: 1, y: 0 });

        expect(updated).toBe(circuit);
        expect(updated.getComponentAt({ x: 1, y: 0 })).toBe(source);
    });

    it("replaces a component with the selected component", () => {
        const source = component("source-1", "source", 0, 0);
        const circuit = CircuitLayout.empty(1, 1).withComponent(source);

        const tool: EditorTool = {
            kind: "component",
            componentType: "light",
            rotation: 0,
        };

        const updated = applyEditorTool(circuit, tool, { x: 0, y: 0 });

        const replacement = updated.getComponentAt({ x: 0, y: 0 });

        expect(replacement).toMatchObject({
            type: "light",
            position: {
                x: 0,
                y: 0,
            },
            rotation: 0,
        });

        expect(replacement?.id).not.toBe(source.id);
        expect(circuit.getComponentAt({ x: 0, y: 0 })).toBe(source);
    });
});
