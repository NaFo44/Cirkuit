// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { CircuitLayout } from "./domain/circuit/circuitLayout";
import { ModuleCatalog } from "./domain/circuit/modules/moduleCatalog";
import { createModuleInstance } from "./domain/circuit/modules/moduleDefinition";
import { createTestModule } from "./test/moduleFixtures";

vi.mock("./demo/defaultProject", () => ({
    createDefaultProject: () => {
        const definition = createTestModule({
            footprint: { width: 4, height: 3 },
        });
        return {
            circuit: CircuitLayout.from(
                {
                    width: 20,
                    height: 16,
                    components: [
                        createModuleInstance(definition.id, {
                            id: "module-1",
                            position: { x: 2, y: 3 },
                            rotation: 90,
                            layer: 0,
                        }),
                        {
                            id: "wire-1",
                            type: "wire",
                            position: { x: 1, y: 4 },
                            rotation: 0,
                            layer: 0,
                        },
                    ],
                },
                new ModuleCatalog([definition]),
            ),
            modules: [definition],
            annotations: [],
            viewport: { x: 0, y: 0, zoom: 1 },
        };
    },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("module editing in the canvas", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        vi.spyOn(
            HTMLElement.prototype,
            "getBoundingClientRect",
        ).mockImplementation(function (this: HTMLElement) {
            const width = parseFloat(this.style.width) || 400;
            const height = parseFloat(this.style.height) || 320;
            return new DOMRect(0, 0, width, height);
        });
        vi.stubGlobal("PointerEvent", MouseEvent);
        container = document.createElement("div");
        document.body.append(container);
        root = createRoot(container);
        act(() => root.render(<App />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    function movePointer(x: number, y: number) {
        const canvas = container.querySelector(".circuit-canvas")!;
        act(() => {
            canvas.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: x * 20 + 10,
                    clientY: y * 20 + 10,
                }),
            );
        });
    }

    function key(key: string, code: string, ctrlKey = false, type = "keydown") {
        act(() => {
            window.dispatchEvent(
                new KeyboardEvent(type, {
                    key,
                    code,
                    ctrlKey,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });
    }

    function select(start: [number, number], end = start) {
        key("s", "KeyS");
        const layer = container.querySelector<HTMLElement>(".selection-layer")!;
        Object.assign(layer, {
            setPointerCapture: vi.fn(),
            hasPointerCapture: () => false,
        });

        for (const [type, point] of [
            ["pointerdown", start],
            ["pointerup", end],
        ] as const) {
            act(() => {
                const event = new PointerEvent(type, {
                    button: 0,
                    bubbles: true,
                    clientX: point[0] * 20 + 10,
                    clientY: point[1] * 20 + 10,
                });
                Object.defineProperty(event, "pointerId", { value: 1 });
                layer.dispatchEvent(event);
            });
        }
        key("s", "KeyS", false, "keyup");
    }

    it("copies and pastes a module selected alone from inside its footprint", () => {
        select([3, 5]);
        expect(
            container.querySelectorAll(
                '[role="gridcell"][aria-selected="true"]',
            ),
        ).toHaveLength(1);

        key("c", "KeyC", true);
        movePointer(8, 8);
        key("v", "KeyV", true);

        const modules = container.querySelectorAll<HTMLElement>(
            ".circuit-cell--module",
        );
        expect(modules).toHaveLength(2);
        expect(modules[1].style.left).toBe("160px");
        expect(modules[1].style.top).toBe("160px");
        expect(modules[1].style.width).toBe("60px");
        expect(modules[1].style.height).toBe("80px");
        expect(modules[1].getAttribute("aria-selected")).toBe("true");
        expect(modules[0].getAttribute("aria-selected")).toBeNull();
    });

    it("keeps relative positions when copying a module with another component", () => {
        select([1, 4], [4, 6]);
        expect(
            container.querySelectorAll(
                '[role="gridcell"][aria-selected="true"]',
            ),
        ).toHaveLength(2);

        key("c", "KeyC", true);
        movePointer(8, 8);
        key("v", "KeyV", true);

        const modules = container.querySelectorAll<HTMLElement>(
            ".circuit-cell--module",
        );
        const wires = container.querySelectorAll<HTMLElement>(
            ".circuit-cell--wire",
        );
        expect(modules).toHaveLength(2);
        expect(wires).toHaveLength(2);
        expect(modules[1].style.left).toBe("180px");
        expect(modules[1].style.top).toBe("160px");
        expect(wires[1].style.left).toBe("160px");
        expect(wires[1].style.top).toBe("180px");
    });

    it("pastes a module nearby when the cursor is over the original", () => {
        select([3, 5]);
        key("c", "KeyC", true);
        movePointer(3, 5);
        key("v", "KeyV", true);

        const modules = container.querySelectorAll<HTMLElement>(
            ".circuit-cell--module",
        );
        expect(modules).toHaveLength(2);
        expect(modules[0].style.left).toBe("40px");
        expect(modules[0].style.top).toBe("60px");
        expect(modules[1].style.left).toBe("100px");
        expect(modules[1].style.top).toBe("100px");
        expect(modules[1].getAttribute("aria-selected")).toBe("true");

        key("v", "KeyV", true);
        expect(
            container.querySelectorAll(".circuit-cell--module"),
        ).toHaveLength(3);
    });

    it("anchors the eraser preview to the entire rotated module", () => {
        const eraser = container.querySelector<HTMLButtonElement>(
            'button[aria-label="Eraser"]',
        )!;
        act(() => eraser.click());

        for (const point of [
            [2, 3],
            [3, 5],
            [4, 6],
        ]) {
            movePointer(point[0], point[1]);
            const preview =
                container.querySelector<HTMLElement>(".cell-preview")!;
            expect(preview.style.left).toBe("40px");
            expect(preview.style.top).toBe("60px");
            expect(preview.style.width).toBe("60px");
            expect(preview.style.height).toBe("80px");
        }

        movePointer(7, 8);
        const preview = container.querySelector<HTMLElement>(".cell-preview")!;
        expect(preview.style.left).toBe("140px");
        expect(preview.style.top).toBe("160px");
        expect(preview.style.width).toBe("20px");
        expect(preview.style.height).toBe("20px");
    });

    it("erases a selected module instead of starting a move and supports undo", () => {
        select([3, 5]);
        const eraser = container.querySelector<HTMLButtonElement>(
            'button[aria-label="Eraser"]',
        )!;
        act(() => eraser.click());

        expect(
            container.querySelector(".selection-layer--move-enabled"),
        ).toBeNull();
        const grid = container.querySelector<HTMLElement>('[role="grid"]')!;
        Object.assign(grid, {
            setPointerCapture: vi.fn(),
            hasPointerCapture: () => false,
        });
        Object.defineProperties(grid, {
            offsetWidth: { value: 400 },
            offsetHeight: { value: 320 },
        });

        for (const type of ["pointerdown", "pointerup"]) {
            act(() => {
                const event = new PointerEvent(type, {
                    button: 0,
                    bubbles: true,
                    clientX: 70,
                    clientY: 110,
                });
                Object.defineProperty(event, "pointerId", { value: 1 });
                grid.dispatchEvent(event);
            });
        }

        expect(
            container.querySelectorAll(".circuit-cell--module"),
        ).toHaveLength(0);
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            1,
        );
        expect(container.querySelector(".selection-layer--moving")).toBeNull();

        key("z", "KeyZ", true);
        expect(
            container.querySelectorAll(".circuit-cell--module"),
        ).toHaveLength(1);
    });
});
