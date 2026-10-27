// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestModule, createTestProject } from "../../test/moduleFixtures";
import { updateProjectModules } from "../../domain/project/updateProjectModules";
import { createModuleInstance } from "../../domain/circuit/modules/moduleDefinition";
import {
    createModuleDraftProject,
    suggestModuleDraftName,
} from "../../domain/circuit/modules/moduleDraft";
import { useModuleDraftWorkspace } from "./useModuleDraftWorkspace";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Workspace = ReturnType<typeof useModuleDraftWorkspace>;

function createMainProject() {
    const project = createTestProject();
    return updateProjectModules(project, [createTestModule()]);
}

function WorkspaceProbe({
    onChange,
}: {
    onChange: (workspace: Workspace) => void;
}) {
    const workspace = useModuleDraftWorkspace(createMainProject);
    useLayoutEffect(() => onChange(workspace), [workspace, onChange]);
    return null;
}

describe("module draft workspace", () => {
    let container: HTMLDivElement;
    let root: Root;
    let workspace: Workspace;
    const mainView = { x: -120, y: 45, zoom: 2 };

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
        root = createRoot(container);
        act(() =>
            root.render(
                <WorkspaceProbe
                    onChange={(next) => {
                        workspace = next;
                    }}
                />,
            ),
        );
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function paint(x: number, y: number) {
        act(() =>
            workspace.editor.paintCell(
                { kind: "component", componentType: "wire", rotation: 0 },
                { x, y },
                0,
            ),
        );
    }

    it("opens a primitive-only draft without adding it to the main catalog", () => {
        const mainCircuit = workspace.editor.project.circuit;
        expect(workspace.isDraft).toBe(false);
        expect(workspace.draft).toBeNull();
        act(() => workspace.openDraft(mainView));
        expect(workspace.isDraft).toBe(true);
        expect(workspace.draft?.id).toBeTruthy();
        expect(workspace.editor.project.modules).toEqual([]);
        expect(workspace.editor.project.circuit.components).toEqual([]);
        expect(
            workspace.editor.project.circuit.registry.has("module:inverter"),
        ).toBe(false);
        act(() => workspace.openMain());
        expect(workspace.editor.project.circuit).toBe(mainCircuit);
        expect(workspace.editor.project.modules).toHaveLength(1);
    });

    it("edits a private copy and preserves contents, annotations and public port ids", () => {
        act(() =>
            workspace.editor.updateModules([
                createTestModule({
                    annotations: [
                        {
                            id: "label",
                            kind: "label",
                            position: { x: 20, y: 20 },
                            text: "Internal",
                        },
                    ],
                }),
            ]),
        );
        const original = workspace.editor.project.modules[0];
        act(() =>
            expect(workspace.openModule("inverter", mainView)).toBeNull(),
        );
        expect(workspace.editingModuleId).toBe("inverter");
        expect(workspace.draft).toEqual({
            id: original.id,
            name: original.name,
            footprint: original.footprint,
            ports: original.ports,
        });
        expect(workspace.draft!.ports).not.toBe(original.ports);
        expect(workspace.editor.project.annotations).toEqual(
            original.annotations,
        );
        expect(workspace.editor.project.annotations).not.toBe(
            original.annotations,
        );
        expect(workspace.editor.project.circuit.components).toEqual(
            original.circuit.components,
        );
        expect(
            workspace.editor.project.circuit.registry.has("module:inverter"),
        ).toBe(false);
        act(() => workspace.renamePort("a", "Changed"));
        paint(2, 2);
        act(() => workspace.openMain());
        expect(workspace.editor.project.modules[0]).toBe(original);
        expect(original.ports[0].name).toBe("A");
        expect(original.circuit.components).toHaveLength(1);
        act(() =>
            expect(workspace.openModule("inverter", mainView)).toBeNull(),
        );
        expect(workspace.draft!.ports[0]).toMatchObject({
            id: "a",
            name: "A",
        });
        expect(workspace.editor.project.circuit.components).toHaveLength(1);
    });

    it("saves an existing module once, updates rotated instances and supports undo and redo", () => {
        const main = workspace.editor.project;
        act(() =>
            workspace.editor.updateCircuit(
                main.circuit
                    .withComponent(
                        createModuleInstance("inverter", {
                            id: "first",
                            position: { x: 0, y: 0 },
                            rotation: 0,
                            layer: 0,
                        }),
                    )
                    .withComponent(
                        createModuleInstance("inverter", {
                            id: "second",
                            position: { x: 6, y: 6 },
                            rotation: 90,
                            layer: 1,
                        }),
                    ),
            ),
        );
        const before = workspace.editor.project;
        act(() => workspace.openModule("inverter", mainView));
        act(() => workspace.renameDraft("Updated inverter"));
        act(() => workspace.renamePort("a", "Input"));
        act(() => workspace.resizeDraft({ width: 4, height: 3 }));
        paint(2, 2);
        act(() => expect(workspace.publishDraft()).toBeNull());
        expect(workspace.editingModuleId).toBeNull();
        expect(workspace.editor.project.modules).toHaveLength(1);
        expect(workspace.editor.project.modules[0]).toMatchObject({
            id: "inverter",
            name: "Updated inverter",
            ports: [{ id: "a", name: "Input" }, { id: "q" }],
        });
        expect(
            workspace.editor.project.modules[0].circuit.components,
        ).toHaveLength(2);
        expect(
            workspace.editor.project.circuit.getComponentAt({ x: 3, y: 1 }, 0)
                ?.id,
        ).toBe("first");
        expect(
            workspace.editor.project.circuit.getComponentAt({ x: 7, y: 9 }, 1)
                ?.id,
        ).toBe("second");
        act(() => workspace.editor.undo());
        expect(workspace.editor.project.modules).toBe(before.modules);
        expect(workspace.editor.project.circuit.components).toEqual(
            before.circuit.components,
        );
        act(() => workspace.editor.redo());
        expect(workspace.editor.project.modules[0].name).toBe(
            "Updated inverter",
        );
    });

    it.each(["overlap", "grid boundary"])(
        "keeps the draft and main project intact when saving would hit %s",
        (failure) => {
            let circuit = workspace.editor.project.circuit.withComponent(
                createModuleInstance("inverter", {
                    id: "instance",
                    position: { x: failure === "overlap" ? 0 : 9, y: 0 },
                    rotation: 0,
                    layer: 0,
                }),
            );
            if (failure === "overlap")
                circuit = circuit.withComponent({
                    id: "wire",
                    type: "wire",
                    position: { x: 3, y: 1 },
                    rotation: 0,
                    layer: 0,
                });
            act(() => workspace.editor.updateCircuit(circuit));
            const before = workspace.editor.project;
            act(() => workspace.openModule("inverter", mainView));
            act(() => workspace.resizeDraft({ width: 4, height: 3 }));
            act(() =>
                expect(workspace.publishDraft()).toContain("Cannot save"),
            );
            expect(workspace.isDraft).toBe(true);
            expect(workspace.draft!.footprint.width).toBe(4);
            act(() => workspace.openMain());
            expect(workspace.editor.project.modules).toBe(before.modules);
            expect(workspace.editor.project.circuit).toBe(before.circuit);
            act(() => workspace.openModule("inverter", mainView));
            act(() => workspace.resizeDraft({ width: 3, height: 3 }));
            act(() => expect(workspace.publishDraft()).toBeNull());
        },
    );

    it("discards changes without changing the definition or the main undo history", () => {
        const before = workspace.editor.project;
        act(() => workspace.openModule("inverter", mainView));
        act(() => workspace.renameDraft("Discarded"));
        paint(2, 2);
        act(() => workspace.openMain());
        expect(workspace.isDraft).toBe(false);
        expect(workspace.draft).toBeNull();
        expect(workspace.editingModuleId).toBeNull();
        expect(workspace.editor.project.modules).toBe(before.modules);
        expect(workspace.editor.canUndo).toBe(false);
        act(() => workspace.openModule("inverter", mainView));
        expect(workspace.draft!.name).toBe("Inverter");
        expect(workspace.editor.project.circuit.components).toHaveLength(1);
        expect(workspace.editor.canUndo).toBe(false);
    });

    it("allows editing another module immediately after abandoning creation", () => {
        act(() =>
            expect(workspace.openModule("missing", mainView)).toContain(
                "no longer exists",
            ),
        );
        expect(workspace.isDraft).toBe(false);
        act(() => workspace.openDraft(mainView));
        paint(2, 2);
        act(() => workspace.openMain());
        act(() =>
            expect(workspace.openModule("inverter", mainView)).toBeNull(),
        );
        expect(workspace.draft!.id).toBe("inverter");
        expect(workspace.editor.project.circuit.components).toHaveLength(1);
        act(() => workspace.replaceProject(createMainProject()));
        expect(workspace.editingModuleId).toBeNull();
    });

    it("rejects editing a definition removed after leaving its editor", () => {
        act(() => workspace.openModule("inverter", mainView));
        act(() => workspace.openMain());
        act(() => workspace.editor.updateModules([]));
        act(() =>
            expect(workspace.openModule("inverter", mainView)).toContain(
                "no longer exists",
            ),
        );
        expect(workspace.isDraft).toBe(false);
        expect(workspace.draft).toBeNull();
    });

    it("abandons unsaved creation and returns to the catalog with the main camera", () => {
        act(() => workspace.openDraft(mainView));
        const id = workspace.draft!.id;
        act(() => workspace.renameDraft("My module"));
        paint(2, 3);
        act(() => workspace.openMain());
        expect(workspace.mainView).toBe("modules");
        expect(workspace.draft).toBeNull();
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
        expect(workspace.editor.project.viewport).toEqual(mainView);
        act(() => workspace.openDraft(mainView));
        expect(workspace.draft!.id).not.toBe(id);
        expect(workspace.draft!.name).toBe("Module 1");
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
        expect(workspace.editor.canUndo).toBe(false);
    });

    it("keeps the main circuit and draft undo histories independent", () => {
        paint(1, 1);
        act(() => workspace.openDraft(mainView));
        expect(workspace.editor.canUndo).toBe(false);
        paint(2, 2);
        act(() => workspace.openMain());
        expect(workspace.editor.project.circuit.components).toHaveLength(1);
        act(() => workspace.editor.undo());
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
        act(() => workspace.openDraft(mainView));
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
        expect(workspace.editor.canUndo).toBe(false);
        expect(workspace.editor.canRedo).toBe(false);
        act(() => workspace.openMain());
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
        expect(workspace.editor.canRedo).toBe(true);
    });

    it("copies camera values and does not turn navigation into an undo step", () => {
        const camera = { ...mainView };
        act(() => workspace.openDraft(camera));
        camera.x = 999;
        act(() => workspace.openMain());
        expect(workspace.editor.project.viewport).toEqual(mainView);
        expect(workspace.editor.canUndo).toBe(false);
        expect(workspace.editor.canRedo).toBe(false);
        act(() => workspace.openDraft(mainView));
        expect(workspace.editor.canUndo).toBe(false);
    });

    it("finishes a pending paint gesture before leaving its workspace", () => {
        act(() => workspace.editor.beginPaint());
        paint(1, 1);
        act(() => workspace.openDraft(mainView));
        act(() => workspace.openMain());
        expect(workspace.editor.canUndo).toBe(true);
        act(() => workspace.editor.undo());
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
    });

    it("resets the draft and histories when opening a different project", () => {
        act(() => workspace.openDraft(mainView));
        const previousId = workspace.draft!.id;
        paint(2, 2);
        act(() => workspace.renameDraft("Old draft"));
        const imported = createTestProject();
        act(() => workspace.replaceProject(imported));
        expect(workspace.isDraft).toBe(false);
        expect(workspace.draft).toBeNull();
        expect(workspace.editor.project).toBe(imported);
        expect(workspace.editor.canUndo).toBe(false);
        act(() => workspace.openDraft(mainView));
        expect(workspace.draft!.id).not.toBe(previousId);
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
        expect(workspace.editor.canUndo).toBe(false);
    });

    it("abandons body settings and ports when leaving unsaved creation", () => {
        act(() => workspace.openDraft(mainView));
        paint(2, 2);
        const reference = {
            componentId: workspace.editor.project.circuit.getComponentAt({
                x: 2,
                y: 2,
            })!.id,
            portId: "west",
        };
        act(() => {
            expect(workspace.resizeDraft({ width: 6, height: 4 })).toBeNull();
        });
        act(() => {
            expect(
                workspace.addPort("input", reference.componentId).error,
            ).toBeNull();
        });
        const configured = workspace.draft;
        act(() => workspace.openMain());
        act(() => workspace.openDraft(mainView));
        expect(workspace.draft).not.toBe(configured);
        expect(workspace.draft!.ports).toEqual([]);
        expect(workspace.draft!.footprint).toEqual({ width: 5, height: 5 });
    });

    it("refuses occupied cells and preserves port identity when reconnecting", () => {
        act(() => workspace.openDraft(mainView));
        paint(2, 2);
        const componentId = workspace.editor.project.circuit.getComponentAt({
            x: 2,
            y: 2,
        })!.id;
        act(() => {
            workspace.addPort("input", componentId);
        });
        act(() => {
            workspace.addPort("output", componentId);
        });
        const [input, output] = workspace.draft!.ports;
        const before = workspace.draft;
        act(() => {
            expect(
                workspace.movePort(output.id, input.side, input.offset!),
            ).not.toBeNull();
        });
        expect(workspace.draft).toBe(before);
        act(() => {
            expect(workspace.reconnectPort(output.id, componentId)).toBeNull();
        });
        expect(workspace.draft!.ports[1]).toMatchObject({
            id: output.id,
            internalPort: { componentId, portId: "north" },
        });
    });

    it("accepts a wire cell even when all its sides are connected", () => {
        act(() => workspace.openDraft(mainView));
        paint(2, 2);
        paint(3, 2);
        paint(1, 2);
        paint(2, 1);
        paint(2, 3);
        const componentId = workspace.editor.project.circuit.getComponentAt({
            x: 2,
            y: 2,
        })!.id;
        act(() =>
            expect(workspace.addPort("input", componentId).error).toBeNull(),
        );
        expect(workspace.draft!.ports).toHaveLength(1);
        act(() =>
            expect(workspace.addPort("input", componentId).error).toBeNull(),
        );
        const before = workspace.draft;
        act(() =>
            expect(
                workspace.reconnectPort(before!.ports[0].id, componentId),
            ).toBeNull(),
        );
        expect(workspace.draft!.ports[0].internalPort).toEqual({
            componentId,
            portId: "north",
        });
    });

    it("rejects gates, vias and missing cells for new wire assignments", () => {
        act(() => workspace.openModule("inverter", mainView));
        act(() =>
            workspace.editor.paintCell(
                { kind: "component", componentType: "via", rotation: 0 },
                { x: 2, y: 2 },
                0,
            ),
        );
        const viaId = workspace.editor.project.circuit.getComponentAt({
            x: 2,
            y: 2,
        })!.id;
        const before = workspace.draft;
        for (const id of ["not-1", viaId, "missing"]) {
            act(() =>
                expect(workspace.addPort("input", id).error).toContain("wire"),
            );
            act(() =>
                expect(workspace.reconnectPort("a", id)).toContain("wire"),
            );
            expect(workspace.draft).toBe(before);
        }
    });

    it("publishes the module in one undoable main-project operation", () => {
        act(() => workspace.openDraft(mainView));
        paint(2, 2);
        const componentId = workspace.editor.project.circuit.getComponentAt({
            x: 2,
            y: 2,
        })!.id;
        act(() => {
            workspace.addPort("input", componentId);
        });
        const id = workspace.draft!.id;
        act(() => {
            expect(workspace.publishDraft()).toBeNull();
        });
        expect(workspace.isDraft).toBe(false);
        expect(workspace.mainView).toBe("modules");
        expect(workspace.draft).toBeNull();
        expect(workspace.editor.project.modules).toHaveLength(2);
        expect(
            workspace.editor.project.modules.find((module) => module.id === id)!
                .circuit.components,
        ).toHaveLength(1);
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
        act(() => workspace.editor.undo());
        expect(workspace.editor.project.modules).toHaveLength(1);
        act(() => workspace.editor.redo());
        expect(workspace.editor.project.modules).toHaveLength(2);
        act(() => workspace.openDraft(mainView));
        expect(workspace.draft!.ports).toHaveLength(0);
        expect(workspace.editor.project.circuit.components).toHaveLength(0);
    });

    it("keeps the draft when publication fails and recovers after undoing an erasure", () => {
        act(() => workspace.openDraft(mainView));
        paint(2, 2);
        const componentId = workspace.editor.project.circuit.getComponentAt({
            x: 2,
            y: 2,
        })!.id;
        act(() => {
            workspace.addPort("input", componentId);
        });
        act(() => workspace.editor.removeComponents([componentId]));
        act(() => {
            expect(workspace.publishDraft()).not.toBeNull();
        });
        expect(workspace.isDraft).toBe(true);
        expect(workspace.draft!.ports).toHaveLength(1);
        act(() => workspace.editor.undo());
        act(() => {
            expect(workspace.publishDraft()).toBeNull();
        });
        expect(workspace.editor.project.modules).toHaveLength(2);
    });
});

describe("draft defaults", () => {
    it("suggests the first unused module name without changing the catalog", () => {
        const modules = [
            createTestModule({ id: "first", name: "Module 1" }),
            createTestModule({ id: "third", name: "Module 3" }),
        ];
        expect(suggestModuleDraftName(modules)).toBe("Module 2");
        expect(modules.map((module) => module.name)).toEqual([
            "Module 1",
            "Module 3",
        ]);
        expect(suggestModuleDraftName([])).toBe("Module 1");
    });
    it("creates independent blank circuits", () => {
        const first = createModuleDraftProject();
        const second = createModuleDraftProject();
        expect(first.circuit).not.toBe(second.circuit);
        expect(first.modules).toEqual([]);
        expect(first.annotations).toEqual([]);
    });
});
