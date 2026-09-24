import { describe, expect, it } from "vitest";

import { CircuitLayout } from "./circuitLayout";
import {
    createComponentClipboard,
    pasteComponentClipboard,
} from "./componentClipboard";
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
            component("blocker", "light", 0, 0),
            component("source", "source", 2, 1, 90),
            component("wire", "wire", 4, 2, 270),
        ],
    });
}

describe("componentClipboard", () => {
    it("copies selected components relative to their top-left corner", () => {
        const clipboard = createComponentClipboard(
            createCircuit(),
            new Set(["source", "wire"]),
        );

        expect(clipboard).toEqual({
            components: [
                {
                    type: "source",
                    rotation: 90,
                    offset: { x: 0, y: 0 },
                },
                {
                    type: "wire",
                    rotation: 270,
                    offset: { x: 2, y: 1 },
                },
            ],
        });
    });

    it("ignores components outside the selection", () => {
        const clipboard = createComponentClipboard(
            createCircuit(),
            new Set(["wire"]),
        );

        expect(clipboard).toEqual({
            components: [
                {
                    type: "wire",
                    rotation: 270,
                    offset: { x: 0, y: 0 },
                },
            ],
        });
    });

    it("returns null when no existing component is selected", () => {
        expect(
            createComponentClipboard(createCircuit(), new Set(["missing"])),
        ).toBeNull();
    });

    it("pastes components at the requested position with new ids", () => {
        const circuit = createCircuit();
        const clipboard = createComponentClipboard(
            circuit,
            new Set(["source", "wire"]),
        );

        if (!clipboard) {
            throw new Error("Expected a clipboard");
        }

        let nextId = 0;

        const result = pasteComponentClipboard(
            circuit,
            clipboard,
            { x: 1, y: 1 },
            () => `copy-${++nextId}`,
        );

        if (!result) {
            throw new Error("Expected the paste to succeed");
        }

        expect(result.circuit.getComponentById("copy-1")).toEqual(
            component("copy-1", "source", 1, 1, 90),
        );

        expect(result.circuit.getComponentById("copy-2")).toEqual(
            component("copy-2", "wire", 3, 2, 270),
        );

        expect(result.componentIds).toEqual(new Set(["copy-1", "copy-2"]));
    });

    it("does not mutate the original circuit when pasting", () => {
        const circuit = createCircuit();
        const clipboard = createComponentClipboard(
            circuit,
            new Set(["source", "wire"]),
        );

        if (!clipboard) {
            throw new Error("Expected a clipboard");
        }

        const result = pasteComponentClipboard(
            circuit,
            clipboard,
            { x: 1, y: 1 },
            () => crypto.randomUUID(),
        );

        expect(result).not.toBeNull();
        expect(circuit.components).toHaveLength(3);
        expect(circuit.getComponentById("source")?.position).toEqual({
            x: 2,
            y: 1,
        });
    });

    it("rejects the whole paste when a destination is occupied", () => {
        const circuit = createCircuit();
        const clipboard = createComponentClipboard(
            circuit,
            new Set(["source", "wire"]),
        );

        if (!clipboard) {
            throw new Error("Expected a clipboard");
        }

        let createdIdCount = 0;

        const result = pasteComponentClipboard(
            circuit,
            clipboard,
            { x: 2, y: 1 },
            () => {
                createdIdCount += 1;
                return `copy-${createdIdCount}`;
            },
        );

        expect(result).toBeNull();
        expect(createdIdCount).toBe(0);
        expect(circuit.components).toHaveLength(3);
    });

    it.each([
        {
            description: "left",
            position: { x: -1, y: 0 },
        },
        {
            description: "right",
            position: { x: 4, y: 0 },
        },
        {
            description: "bottom",
            position: { x: 0, y: 3 },
        },
    ])(
        "rejects a paste extending outside the $description boundary",
        ({ position }) => {
            const circuit = createCircuit();
            const clipboard = createComponentClipboard(
                circuit,
                new Set(["source", "wire"]),
            );

            if (!clipboard) {
                throw new Error("Expected a clipboard");
            }

            expect(
                pasteComponentClipboard(circuit, clipboard, position, () =>
                    crypto.randomUUID(),
                ),
            ).toBeNull();
        },
    );
});
