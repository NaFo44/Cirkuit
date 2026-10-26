import { describe, expect, it, vi } from "vitest";

import { createTestModule } from "../../test/moduleFixtures";
import { CircuitLayout } from "./circuitLayout";
import {
    createComponentClipboard,
    pasteComponentClipboardNearby,
} from "./componentClipboard";
import { ModuleCatalog } from "./modules/moduleCatalog";
import { createModuleInstance } from "./modules/moduleDefinition";
import type { PlacedComponent } from "./placedComponent";

function fixture(extraComponents: readonly PlacedComponent[] = []) {
    const definition = createTestModule({ footprint: { width: 4, height: 3 } });
    const catalog = new ModuleCatalog([definition]);
    const circuit = CircuitLayout.from(
        {
            width: 12,
            height: 12,
            components: [
                createModuleInstance(definition.id, {
                    id: "original",
                    position: { x: 2, y: 2 },
                    rotation: 90,
                    layer: 0,
                }),
                ...extraComponents,
            ],
        },
        catalog,
    );
    return {
        circuit,
        clipboard: createComponentClipboard(circuit, new Set(["original"]))!,
    };
}

describe("nearby clipboard paste", () => {
    it("uses the cursor position when the complete footprint fits", () => {
        const { circuit, clipboard } = fixture();
        const createId = vi.fn(() => "copy");
        const result = pasteComponentClipboardNearby(
            circuit,
            clipboard,
            { x: 7, y: 7 },
            createId,
        );

        expect(result?.circuit.getComponentById("copy")).toMatchObject({
            type: "module:inverter",
            position: { x: 7, y: 7 },
            rotation: 90,
            layer: 0,
        });
        expect(result?.circuit.registry).toBe(circuit.registry);
        expect(result?.componentIds).toEqual(new Set(["copy"]));
        expect(createId).toHaveBeenCalledTimes(1);
    });

    it("finds the closest free position when hovering the original module", () => {
        const { circuit, clipboard } = fixture();
        const createId = vi.fn(() => "copy");
        const result = pasteComponentClipboardNearby(
            circuit,
            clipboard,
            { x: 3, y: 3 },
            createId,
        );

        expect(result?.circuit.getComponentById("copy")?.position).toEqual({
            x: 5,
            y: 3,
        });
        expect(result?.circuit.getComponentAt({ x: 7, y: 6 })?.id).toBe("copy");
        expect(result?.circuit.getComponentById("original")).toBe(
            circuit.getComponentById("original"),
        );
        expect(circuit.components).toHaveLength(1);
        expect(createId).toHaveBeenCalledTimes(1);
    });

    it("skips candidates obstructed only at the far edge of the module", () => {
        const blocker: PlacedComponent = {
            id: "blocker",
            type: "wire",
            position: { x: 7, y: 6 },
            rotation: 0,
            layer: 0,
        };
        const { circuit, clipboard } = fixture([blocker]);
        const result = pasteComponentClipboardNearby(
            circuit,
            clipboard,
            { x: 3, y: 3 },
            () => "copy",
        );

        expect(result?.circuit.getComponentById("copy")?.position).toEqual({
            x: 5,
            y: 2,
        });
        expect(result?.circuit.getComponentAt(blocker.position)).toBe(blocker);
    });

    it("finds a position inside the grid when the cursor is near its boundary", () => {
        const { circuit, clipboard } = fixture();
        const result = pasteComponentClipboardNearby(
            circuit,
            clipboard,
            { x: 11, y: 11 },
            () => "copy",
        );

        expect(result?.circuit.getComponentById("copy")?.position).toEqual({
            x: 9,
            y: 8,
        });
        expect(result?.circuit.getComponentAt({ x: 11, y: 11 })?.id).toBe(
            "copy",
        );
    });

    it("preserves the whole group when falling back to a nearby location", () => {
        const wire: PlacedComponent = {
            id: "wire",
            type: "wire",
            position: { x: 1, y: 4 },
            rotation: 0,
            layer: 0,
        };
        const { circuit } = fixture([wire]);
        const clipboard = createComponentClipboard(
            circuit,
            new Set(["original", "wire"]),
        )!;
        let id = 0;
        const result = pasteComponentClipboardNearby(
            circuit,
            clipboard,
            { x: 3, y: 3 },
            () => `copy-${++id}`,
        );
        const modulePosition =
            result?.circuit.getComponentById("copy-1")?.position;
        const wirePosition =
            result?.circuit.getComponentById("copy-2")?.position;

        expect(result?.componentIds.size).toBe(2);
        expect(modulePosition).toBeDefined();
        expect(wirePosition).toEqual({
            x: modulePosition!.x - 1,
            y: modulePosition!.y + 2,
        });
        expect(id).toBe(2);
        expect(result?.circuit.components).toHaveLength(4);
    });

    it("allows the cursor location when occupied only on the other layer", () => {
        const { circuit, clipboard } = fixture([
            {
                id: "other-layer",
                type: "wire",
                position: { x: 7, y: 7 },
                rotation: 0,
                layer: 1,
            },
        ]);
        const result = pasteComponentClipboardNearby(
            circuit,
            clipboard,
            { x: 7, y: 7 },
            () => "copy",
        );

        expect(result?.circuit.getComponentAt({ x: 7, y: 7 }, 0)?.id).toBe(
            "copy",
        );
        expect(result?.circuit.getComponentAt({ x: 7, y: 7 }, 1)?.id).toBe(
            "other-layer",
        );
    });

    it("creates no ids and changes nothing when no location can fit the copy", () => {
        const definition = createTestModule();
        const circuit = CircuitLayout.from(
            {
                width: 3,
                height: 3,
                components: [
                    createModuleInstance(definition.id, {
                        id: "original",
                        position: { x: 0, y: 0 },
                        rotation: 0,
                        layer: 0,
                    }),
                ],
            },
            new ModuleCatalog([definition]),
        );
        const clipboard = createComponentClipboard(
            circuit,
            new Set(["original"]),
        )!;
        const createId = vi.fn(() => "copy");

        expect(
            pasteComponentClipboardNearby(
                circuit,
                clipboard,
                { x: 1, y: 1 },
                createId,
            ),
        ).toBeNull();
        expect(createId).not.toHaveBeenCalled();
        expect(circuit.components).toHaveLength(1);
        expect(circuit.getComponentById("original")?.position).toEqual({
            x: 0,
            y: 0,
        });
    });
});
