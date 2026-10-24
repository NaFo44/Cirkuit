import { describe, expect, it, vi } from "vitest";

import { CircuitLayout } from "./circuitLayout";
import type { ComponentDefinition } from "./componentDefinition";
import { ComponentRegistry } from "./componentRegistry";
import {
    createComponentClipboard,
    pasteComponentClipboard,
} from "./componentClipboard";
import { BUILT_IN_COMPONENT_DEFINITIONS } from "./components/builtInComponents";
import { canMoveComponents, moveComponents } from "./moveComponents";
import type {
    CircuitLayer,
    PlacedComponent,
    Rotation,
} from "./placedComponent";
import { CELL_SIZE } from "../grid/gridCoordinates";
import {
    createProjectDocument,
    loadProjectDocument,
    parseProjectDocument,
    serializeProjectDocument,
} from "../project/serialization/projectDocument";
import { applyEditorTool } from "../../ui/editor/applyEditorTool";
import { getComponentsInsideRectangle } from "../../ui/selection/componentSelection";

const blockDefinition: ComponentDefinition = {
    type: "block",
    footprint: { width: 3, height: 2 },
    ports: [],
    createInitialState: () => null,
    computeOutputs: () => new Map(),
};

const registry = new ComponentRegistry([
    ...BUILT_IN_COMPONENT_DEFINITIONS,
    blockDefinition,
]);

function component(
    id: string,
    type: string,
    x: number,
    y: number,
    rotation: Rotation = 0,
    layer: CircuitLayer = 0,
): PlacedComponent {
    return { id, type, position: { x, y }, rotation, layer };
}

function layout(components: readonly PlacedComponent[]): CircuitLayout {
    return CircuitLayout.from({ width: 8, height: 6, components }, registry);
}

describe("editing component footprints", () => {
    it("indexes every cell of the rotated footprint", () => {
        const block = component("block", "block", 1, 1, 90);
        const circuit = layout([block]);

        for (let y = 1; y <= 3; y += 1) {
            for (let x = 1; x <= 2; x += 1) {
                expect(circuit.getComponentAt({ x, y })).toBe(block);
            }
        }
        expect(circuit.getComponentAt({ x: 3, y: 1 })).toBeUndefined();
        expect(circuit.getComponentAt({ x: 1, y: 1 }, 1)).toBeUndefined();
    });

    it.each([true, false])(
        "reports the overlapping cell regardless of insertion order (block first: %s)",
        (blockFirst) => {
            const block = component("block", "block", 1, 1);
            const wire = component("wire", "wire", 3, 2);

            expect(() =>
                layout(blockFirst ? [block, wire] : [wire, block]),
            ).toThrow("Multiple components occupy position 3,2 on layer 0");
        },
    );

    it("accepts a rotated footprint ending exactly on the grid boundary", () => {
        const block = component("block", "block", 6, 3, 90);
        const circuit = layout([]);

        expect(circuit.canPlaceComponents([block])).toBe(true);
        expect(() => circuit.withComponent(block)).not.toThrow();
        expect(
            circuit.withComponent(block).getComponentAt({ x: 7, y: 5 }),
        ).toBe(block);
    });

    it("rejects a rotated footprint extending beyond the grid", () => {
        expect(() => layout([component("block", "block", 6, 4, 90)])).toThrow(
            "Component is outside the layout",
        );
    });

    it("erases the entire component from a cell away from its origin", () => {
        const block = component("block", "block", 1, 1);
        const circuit = layout([block]);
        const updated = applyEditorTool(
            circuit,
            { kind: "eraser" },
            { x: 3, y: 2 },
        );

        expect(updated.components).toEqual([]);
        expect(circuit.components).toEqual([block]);
        expect(updated.registry).toBe(registry);
    });

    it.each([
        { x: 1, y: 1 },
        { x: 3, y: 2 },
    ])("protects a larger component when painting at $x,$y", (position) => {
        const circuit = layout([component("block", "block", 1, 1)]);

        expect(
            applyEditorTool(
                circuit,
                { kind: "component", componentType: "wire", rotation: 0 },
                position,
            ),
        ).toBe(circuit);
    });

    it("does not replace existing wires when placing a larger component", () => {
        const circuit = layout([component("wire", "wire", 3, 2)]);

        expect(circuit.withComponent(component("block", "block", 1, 1))).toBe(
            circuit,
        );
    });

    it("allows the opposite layer while checking both layers for vias", () => {
        const circuit = layout([component("block", "block", 1, 1)]);
        const wire = component("wire", "wire", 3, 2, 0, 1);
        const via = component("via", "via", 3, 2, 0, 1);

        expect(circuit.canPlaceComponents([wire])).toBe(true);
        expect(
            circuit.withComponent(wire).getComponentAt({ x: 3, y: 2 }, 1),
        ).toBe(wire);
        expect(circuit.canPlaceComponents([via])).toBe(false);
        expect(circuit.withComponent(via)).toBe(circuit);
    });

    it("rejects a move colliding at the far edge without changing the circuit", () => {
        const block = component("block", "block", 0, 1);
        const circuit = layout([block, component("wire", "wire", 4, 2)]);
        const ids = new Set(["block"]);

        expect(canMoveComponents(circuit, ids, { x: 2, y: 0 })).toBe(false);
        expect(moveComponents(circuit, ids, { x: 2, y: 0 })).toBeNull();
        expect(circuit.getComponentById("block")).toBe(block);
    });

    it("moves a group through its old footprint and preserves the registry", () => {
        const circuit = layout([
            component("a", "block", 0, 0),
            component("b", "block", 3, 0),
        ]);
        const result = moveComponents(circuit, new Set(["a", "b"]), {
            x: 1,
            y: 0,
        });

        expect(result).not.toBeNull();
        expect(result?.registry).toBe(registry);
        expect(result?.getComponentAt({ x: 3, y: 1 })?.id).toBe("a");
        expect(result?.getComponentAt({ x: 6, y: 1 })?.id).toBe("b");
        expect(circuit.getComponentAt({ x: 0, y: 0 })?.id).toBe("a");
    });

    it("checks the full rotated footprint when moving near a boundary", () => {
        const circuit = layout([component("block", "block", 0, 0, 90)]);

        expect(
            moveComponents(circuit, new Set(["block"]), { x: 0, y: 4 }),
        ).toBeNull();
    });

    it("rejects pastes colliding at the far edge before creating ids", () => {
        const circuit = layout([
            component("block", "block", 0, 0),
            component("wire", "wire", 6, 3),
        ]);
        const clipboard = createComponentClipboard(circuit, new Set(["block"]));
        const createId = vi.fn(() => "copy");

        if (!clipboard) throw new Error("Expected a clipboard");

        expect(
            pasteComponentClipboard(
                circuit,
                clipboard,
                { x: 4, y: 2 },
                createId,
            ),
        ).toBeNull();
        expect(createId).not.toHaveBeenCalled();
    });

    it("rejects a paste whose rotated footprint exceeds the grid", () => {
        const circuit = layout([component("block", "block", 0, 0, 90)]);
        const clipboard = createComponentClipboard(circuit, new Set(["block"]));

        if (!clipboard) throw new Error("Expected a clipboard");

        expect(
            pasteComponentClipboard(
                circuit,
                clipboard,
                { x: 7, y: 0 },
                () => "copy",
            ),
        ).toBeNull();
    });

    it("preserves rotation, layer and registry when pasting", () => {
        const circuit = layout([component("block", "block", 0, 0, 90, 1)]);
        const clipboard = createComponentClipboard(circuit, new Set(["block"]));

        if (!clipboard) throw new Error("Expected a clipboard");

        const result = pasteComponentClipboard(
            circuit,
            clipboard,
            { x: 4, y: 2 },
            () => "copy",
        );

        expect(result?.circuit.registry).toBe(registry);
        expect(result?.circuit.getComponentAt({ x: 5, y: 4 }, 1)).toMatchObject(
            {
                id: "copy",
                rotation: 90,
                layer: 1,
            },
        );
        expect(
            result?.circuit.getComponentAt({ x: 5, y: 4 }, 0),
        ).toBeUndefined();
    });

    it("rejects overlaps between pasted components", () => {
        const circuit = layout([]);
        const copied = {
            type: "block",
            rotation: 0 as const,
            layer: 0 as const,
            offset: { x: 0, y: 0 },
        };
        const createId = vi.fn(() => "copy");

        expect(
            pasteComponentClipboard(
                circuit,
                { components: [copied, copied] },
                { x: 1, y: 1 },
                createId,
            ),
        ).toBeNull();
        expect(createId).not.toHaveBeenCalled();
    });

    it("preserves the registry when rebuilding a layout", () => {
        const circuit = layout([component("block", "block", 1, 1)]);
        const rebuilt = CircuitLayout.from(circuit);

        expect(rebuilt.registry).toBe(registry);
        expect(rebuilt.getComponentAt({ x: 3, y: 2 })?.id).toBe("block");
    });

    it("selects a whole component when the rectangle intersects its far edge", () => {
        const circuit = layout([component("block", "block", 1, 1, 90)]);

        expect(
            getComponentsInsideRectangle(
                circuit.components,
                {
                    left: 2 * CELL_SIZE + 1,
                    top: 3 * CELL_SIZE + 1,
                    right: 2 * CELL_SIZE + 2,
                    bottom: 3 * CELL_SIZE + 2,
                },
                circuit.registry,
            ),
        ).toEqual(new Set(["block"]));
    });
});

describe("projects with component footprints", () => {
    it("round-trips a rotated component using its custom registry", () => {
        const block = component("block", "block", 1, 1, 90, 1);
        const project = {
            circuit: layout([block]),
            modules: [],
            annotations: [],
            viewport: { x: 0, y: 0, zoom: 1 },
        };
        const restored = parseProjectDocument(
            serializeProjectDocument(project, registry),
            registry,
        );

        expect(restored.circuit.registry).toBe(registry);
        expect(restored.circuit.getComponentAt({ x: 2, y: 3 }, 1)).toEqual(
            block,
        );
        expect(
            restored.circuit.getComponentAt({ x: 2, y: 3 }, 0),
        ).toBeUndefined();
    });

    it("rejects an imported component overlapping the far edge of a footprint", () => {
        const document = createProjectDocument(
            {
                circuit: layout([component("block", "block", 1, 1)]),
                modules: [],
                annotations: [],
                viewport: { x: 0, y: 0, zoom: 1 },
            },
            registry,
        );
        const overlappingDocument = {
            ...document,
            circuit: {
                ...document.circuit,
                components: [
                    component("wire", "wire", 3, 2),
                    ...document.circuit.components,
                ],
            },
        };

        expect(() =>
            loadProjectDocument(overlappingDocument, registry),
        ).toThrow("Multiple components occupy position 3,2 on layer 0");
    });
});
