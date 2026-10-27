// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import * as projectFile from "./ui/project/projectFile";
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

    function openDraftFromMenu() {
        const modulesButton = [...container.querySelectorAll("button")].find(
            (button) => button.textContent === "Modules",
        )!;
        if (modulesButton) act(() => modulesButton.click());
        const create = container.querySelector<HTMLButtonElement>(
            'button[aria-label="Create module"]',
        )!;
        act(() => create.click());
    }

    function paintDraft(x = 2, y = 2) {
        const grid = container.querySelector<HTMLElement>('[role="grid"]')!;
        Object.assign(grid, {
            setPointerCapture: vi.fn(),
            hasPointerCapture: () => false,
        });
        Object.defineProperties(grid, {
            offsetWidth: { value: parseFloat(grid.style.width) || 1280 },
            offsetHeight: { value: parseFloat(grid.style.height) || 960 },
        });
        for (const type of ["pointerdown", "pointerup"]) {
            act(() => {
                const event = new PointerEvent(type, {
                    bubbles: true,
                    button: 0,
                    clientX: x * 20 + 10,
                    clientY: y * 20 + 10,
                });
                Object.defineProperty(event, "pointerId", { value: 1 });
                grid.dispatchEvent(event);
            });
        }
    }

    function returnMain() {
        act(() => draftButton("Back to main circuit").click());
    }

    function draftButton(text: string) {
        return [
            ...container.querySelectorAll<HTMLButtonElement>(
                ".sidebar-module-draft button",
            ),
        ].find((button) => button.textContent === text)!;
    }

    function exposeWirePort(kind: "input" | "output", x = 2, y = 2) {
        act(() =>
            draftButton(kind === "input" ? "Add input" : "Add output").click(),
        );
        const target = [
            ...container.querySelectorAll<HTMLButtonElement>(
                ".module-port-picker__target",
            ),
        ].find((button) =>
            button.getAttribute("aria-label")?.includes(`wire at ${x},${y}`),
        )!;
        expect(target).toBeDefined();
        act(() => target.click());
    }

    function openExistingModule() {
        const modules = [...container.querySelectorAll("button")].find(
            (button) => button.textContent === "Modules",
        );
        if (modules) act(() => modules.click());
        const edit = container.querySelector<HTMLButtonElement>(
            'button[aria-label="Edit Inverter"]',
        )!;
        expect(edit.draggable).toBe(false);
        expect(edit.querySelector("svg")).not.toBeNull();
        expect(edit.textContent).toBe("");
        act(() => edit.click());
    }

    it("opens an existing module from its Edit button and saves onto the same definition", () => {
        const download = vi
            .spyOn(projectFile, "downloadProjectFile")
            .mockImplementation(() => undefined);
        openExistingModule();
        expect(
            container.querySelectorAll(".circuit-cell--module"),
        ).toHaveLength(0);
        expect(container.querySelectorAll(".circuit-cell--not")).toHaveLength(
            1,
        );
        expect(
            container.querySelectorAll(".sidebar-module-draft__port"),
        ).toHaveLength(2);
        expect(draftButton("Save changes").disabled).toBe(false);
        expect(draftButton("Create module")).toBeUndefined();
        const input = container.querySelector<HTMLInputElement>(
            ".sidebar-module-draft input",
        )!;
        expect(input.value).toBe("Inverter");
        act(() => {
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
            )!.set!.call(input, "Edited inverter");
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        act(() => draftButton("Save changes").click());
        expect(
            container.querySelectorAll(".sidebar-modules__item"),
        ).toHaveLength(1);
        expect(
            container.querySelector(".sidebar-modules__name")?.textContent,
        ).toBe("Edited inverter");
        expect(
            container.querySelectorAll(".circuit-cell--module"),
        ).toHaveLength(1);
        key("s", "KeyS", true);
        expect(download.mock.calls[0][0].modules).toHaveLength(1);
        expect(download.mock.calls[0][0].modules[0]).toMatchObject({
            id: "inverter",
            name: "Edited inverter",
        });
        expect(download.mock.calls[0][0].circuit.components[0]).toMatchObject({
            id: "module-1",
            type: "module:inverter",
            rotation: 90,
        });
        key("z", "KeyZ", true);
        expect(
            container.querySelector(".sidebar-modules__name")?.textContent,
        ).toBe("Inverter");
        key("y", "KeyY", true);
        expect(
            container.querySelector(".sidebar-modules__name")?.textContent,
        ).toBe("Edited inverter");
    });

    it("keeps pin details collapsed and lets the user expand, rename and remove them", () => {
        openExistingModule();
        const pins = [
            ...container.querySelectorAll<HTMLDetailsElement>(
                "details.sidebar-module-draft__port",
            ),
        ];
        expect(pins).toHaveLength(2);
        expect(pins.every((pin) => !pin.open)).toBe(true);
        expect(pins[0].querySelector("summary")!.textContent).toContain("A");
        expect(pins[0].querySelector("summary")!.textContent).toContain(
            "Input",
        );
        act(() => pins[0].querySelector("summary")!.click());
        expect(pins[0].open).toBe(true);
        const name = pins[0].querySelector("input")!;
        act(() => {
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
            )!.set!.call(name, "Clock");
            name.dispatchEvent(new Event("input", { bubbles: true }));
        });
        expect(pins[0].querySelector("summary")!.textContent).toContain(
            "Clock",
        );
        act(() => pins[0].querySelector("summary")!.click());
        expect(pins[0].open).toBe(false);
        act(() => pins[1].querySelector("summary")!.click());
        act(() => pins[1].querySelector<HTMLButtonElement>("button")!.click());
        expect(
            container.querySelectorAll("details.sidebar-module-draft__port"),
        ).toHaveLength(1);
        expect(draftButton("Save changes").disabled).toBe(false);
        expect(
            container.querySelector(".sidebar-module-draft__footer")!
                .parentElement,
        ).toBe(container.querySelector(".sidebar-module-draft"));
    });

    it("abandons changes on return and keeps the catalog open without a resume action", () => {
        openExistingModule();
        const input = container.querySelector<HTMLInputElement>(
            ".sidebar-module-draft input",
        )!;
        act(() => {
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
            )!.set!.call(input, "Discarded");
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        paintDraft();
        act(() => draftButton("Add input").click());
        expect(
            container.querySelectorAll(".module-port-picker__target").length,
        ).toBeGreaterThan(0);
        returnMain();
        expect(container.querySelector(".sidebar-modules")).not.toBeNull();
        const edit = container.querySelector<HTMLButtonElement>(
            'button[aria-label="Edit Inverter"]',
        )!;
        expect(edit.textContent).toBe("");
        expect(container.textContent).not.toContain("Resume");
        expect(container.textContent).not.toContain("Discarded");
        act(() => edit.click());
        expect(
            container.querySelectorAll(".module-port-picker__target"),
        ).toHaveLength(0);
        expect(
            container.querySelector<HTMLInputElement>(
                ".sidebar-module-draft input",
            )!.value,
        ).toBe("Inverter");
        act(() => draftButton("Back to main circuit").click());
        expect(container.querySelector(".sidebar-module-draft")).toBeNull();
        expect(
            container.querySelectorAll(".sidebar-modules__item"),
        ).toHaveLength(1);
        expect(
            container.querySelectorAll(".circuit-cell--module"),
        ).toHaveLength(1);
        expect(
            container.querySelector('button[aria-label="Create module"]'),
        ).not.toBeNull();
        expect(
            container.querySelector<HTMLButtonElement>(
                'button[aria-label="Edit Inverter"]',
            )!.textContent,
        ).toBe("");
    });

    it("binds ports, configures a body and publishes an undoable module in the catalog", () => {
        const download = vi
            .spyOn(projectFile, "downloadProjectFile")
            .mockImplementation(() => undefined);
        openDraftFromMenu();
        expect(draftButton("Create module").disabled).toBe(true);
        paintDraft();
        exposeWirePort("input");
        exposeWirePort("output");
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            1,
        );
        expect(
            container.querySelectorAll(".sidebar-module-draft__port"),
        ).toHaveLength(2);
        expect(
            container.querySelectorAll(".module-port-picker__target"),
        ).toHaveLength(0);

        const width = [
            ...container.querySelectorAll<HTMLLabelElement>(
                ".sidebar-module-draft__dimensions label",
            ),
        ]
            .find((label) => label.textContent === "Body width")!
            .querySelector("input")!;
        act(() => width.focus());
        act(() => {
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
            )!.set!.call(width, "6");
            width.dispatchEvent(new Event("input", { bubbles: true }));
        });
        expect(document.activeElement).toBe(width);
        expect(
            container.querySelector<HTMLElement>(".module-body-editor__body")!
                .style.width,
        ).toBe("120px");
        expect(draftButton("Create module").disabled).toBe(false);
        act(() => draftButton("Create module").click());

        expect(container.querySelector(".sidebar-module-draft")).toBeNull();
        expect(
            container.querySelectorAll(".sidebar-modules__item"),
        ).toHaveLength(2);
        const created = [
            ...container.querySelectorAll<HTMLButtonElement>(
                ".sidebar-modules__item",
            ),
        ].find((button) => button.textContent?.includes("Module 1"))!;
        act(() => created.click());
        expect(
            container.querySelector(".circuit-canvas--placing-module"),
        ).not.toBeNull();
        key("z", "KeyZ", true);
        expect(
            container.querySelectorAll(".sidebar-modules__item"),
        ).toHaveLength(1);
        expect(
            container.querySelector(".circuit-canvas--placing-module"),
        ).toBeNull();
        key("y", "KeyY", true);
        expect(
            container.querySelectorAll(".sidebar-modules__item"),
        ).toHaveLength(2);
        key("s", "KeyS", true);
        const published = download.mock.calls[0][0].modules.find(
            (module) => module.name === "Module 1",
        )!;
        expect(published.footprint).toEqual({ width: 6, height: 5 });
        expect(
            published.ports.map((port) => [
                port.name,
                port.kind,
                port.internalPort.portId,
            ]),
        ).toEqual([
            ["A", "input", "north"],
            ["Y", "output", "north"],
        ]);
    });

    it("cancels port picking with Escape and blocks publication after removing an internal connection", () => {
        openDraftFromMenu();
        paintDraft();
        act(() => draftButton("Add input").click());
        expect(
            container.querySelectorAll(".module-port-picker__target"),
        ).toHaveLength(1);
        key("Escape", "Escape");
        expect(
            container.querySelectorAll(".module-port-picker__target"),
        ).toHaveLength(0);
        exposeWirePort("input");
        const eraser = container.querySelector<HTMLButtonElement>(
            'button[aria-label="Eraser"]',
        )!;
        act(() => eraser.click());
        paintDraft();
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            0,
        );
        expect(draftButton("Create module").disabled).toBe(true);
        expect(container.textContent).toContain("Internal connection missing.");
        key("z", "KeyZ", true);
        expect(draftButton("Create module").disabled).toBe(false);
    });

    it("offers one target per wire cell, including connected wires", () => {
        openDraftFromMenu();
        paintDraft(2, 2);
        paintDraft(3, 2);
        act(() => draftButton("Add input").click());
        const labels = [
            ...container.querySelectorAll(".module-port-picker__target"),
        ].map((target) => target.getAttribute("aria-label"));
        expect(labels).toEqual(["Select wire at 2,2", "Select wire at 3,2"]);
        const target = container.querySelector<HTMLElement>(
            ".module-port-picker__target",
        )!;
        expect(target.style.left).toBe("40px");
        expect(target.style.top).toBe("40px");
        expect(target.style.width).toBe("20px");
        expect(target.style.height).toBe("20px");
        expect(container.textContent).not.toContain(
            "Click an internal connection on the grid",
        );
    });

    it("changes an existing port connection from the preview while preserving its identity", () => {
        const download = vi
            .spyOn(projectFile, "downloadProjectFile")
            .mockImplementation(() => undefined);
        openDraftFromMenu();
        paintDraft();
        paintDraft(3, 2);
        exposeWirePort("input");
        const previewPort = container.querySelector<HTMLButtonElement>(
            '.module-body-editor__cell[aria-label="Select port A"]',
        )!;
        act(() => previewPort.click());
        expect(
            container.querySelectorAll(".module-port-picker__target"),
        ).toHaveLength(2);
        const target = [
            ...container.querySelectorAll<HTMLButtonElement>(
                ".module-port-picker__target",
            ),
        ].find((button) =>
            button.getAttribute("aria-label")?.includes("wire at 3,2"),
        )!;
        act(() => target.click());
        expect(draftButton("Create module").disabled).toBe(false);
        expect(
            container.querySelectorAll(".sidebar-module-draft__port"),
        ).toHaveLength(1);
        act(() => draftButton("Create module").click());
        key("s", "KeyS", true);
        const created = download.mock.calls[0][0].modules.find(
            (module) => module.name === "Module 1",
        )!;
        expect(created.ports).toHaveLength(1);
        expect(created.ports[0]).toMatchObject({
            name: "A",
            kind: "input",
            side: "west",
            internalPort: {
                componentId: created.circuit.components.find(
                    (component) => component.position.x === 3,
                )!.id,
                portId: "north",
            },
        });
    });

    it("keeps the preview valid during incomplete or invalid dimension input", () => {
        openDraftFromMenu();
        const width = [
            ...container.querySelectorAll<HTMLLabelElement>(
                ".sidebar-module-draft__dimensions label",
            ),
        ]
            .find((label) => label.textContent === "Body width")!
            .querySelector("input")!;
        const setWidth = (value: string) =>
            act(() => {
                Object.getOwnPropertyDescriptor(
                    HTMLInputElement.prototype,
                    "value",
                )!.set!.call(width, value);
                width.dispatchEvent(new Event("input", { bubbles: true }));
            });
        act(() => width.focus());
        setWidth("");
        expect(width.value).toBe("");
        expect(
            container.querySelector<HTMLElement>(".module-body-editor__body")!
                .style.width,
        ).toBe("100px");
        setWidth("12");
        expect(document.activeElement).toBe(width);
        expect(
            container.querySelector<HTMLElement>(".module-body-editor__body")!
                .style.width,
        ).toBe("240px");
        setWidth("0");
        expect(
            container.querySelector<HTMLElement>(".module-body-editor__body")!
                .style.width,
        ).toBe("240px");
        act(() => width.blur());
        expect(width.value).toBe("12");
    });

    it("moves a public port by drag and drop on the body preview", () => {
        openDraftFromMenu();
        paintDraft();
        exposeWirePort("input");
        exposeWirePort("output");
        const source = container.querySelector<HTMLButtonElement>(
            '.module-body-editor__cell[aria-label="Select port Y"]',
        )!;
        const target = container.querySelector<HTMLButtonElement>(
            '.module-body-editor__cell[aria-label="Move port to column 2, row 1"]',
        )!;
        const values = new Map<string, string>();
        const dataTransfer = {
            types: [] as string[],
            effectAllowed: "",
            dropEffect: "",
            setData(type: string, value: string) {
                values.set(type, value);
                this.types.push(type);
            },
            getData(type: string) {
                return values.get(type) ?? "";
            },
        };
        for (const [element, type] of [
            [source, "dragstart"],
            [target, "dragover"],
            [target, "drop"],
        ] as const) {
            const event = new Event(type, { bubbles: true, cancelable: true });
            Object.defineProperty(event, "dataTransfer", {
                value: dataTransfer,
            });
            act(() => element.dispatchEvent(event));
        }
        expect(
            container.querySelector(".sidebar-module-draft select"),
        ).toBeNull();
        expect(draftButton("Choose connection")).toBeUndefined();
        expect(draftButton("Create module").disabled).toBe(false);
        expect(
            container.querySelector<HTMLButtonElement>(
                '.module-body-editor__cell[aria-label="Select port Y"]',
            )?.style.top,
        ).toBe("0px");
    });

    it("abandons unsaved creation when returning to the main circuit", () => {
        openDraftFromMenu();
        expect(
            container.querySelector('nav[aria-label="Circuit navigation"]'),
        ).toBeNull();
        expect(container.querySelectorAll(".circuit-component")).toHaveLength(
            0,
        );
        const input = container.querySelector<HTMLInputElement>(
            ".sidebar-module-draft input",
        )!;
        act(() => {
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
            )!.set!.call(input, "Custom module");
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.focus();
        });
        expect(input.value).toBe("Custom module");
        paintDraft();
        expect(document.activeElement).not.toBe(input);
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            1,
        );
        returnMain();
        expect(
            container.querySelectorAll(".circuit-cell--module"),
        ).toHaveLength(1);
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            1,
        );
        expect(
            container.querySelector('nav[aria-label="Circuit navigation"]'),
        ).toBeNull();
        openDraftFromMenu();
        expect(
            container.querySelector<HTMLInputElement>(
                ".sidebar-module-draft input",
            )?.value,
        ).toBe("Module 1");
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            0,
        );
        key("z", "KeyZ", true);
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            0,
        );
        returnMain();
        expect(container.querySelectorAll(".circuit-cell--wire")).toHaveLength(
            1,
        );
    });

    it("exports the main project only, never the temporary draft", () => {
        const download = vi
            .spyOn(projectFile, "downloadProjectFile")
            .mockImplementation(() => undefined);
        openDraftFromMenu();
        paintDraft();
        key("s", "KeyS", true);
        expect(download).not.toHaveBeenCalled();
        returnMain();
        key("s", "KeyS", true);
        expect(download).toHaveBeenCalledTimes(1);
        expect(download.mock.calls[0][0].modules).toHaveLength(1);
        expect(download.mock.calls[0][0].circuit.components).toHaveLength(2);
    });

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
