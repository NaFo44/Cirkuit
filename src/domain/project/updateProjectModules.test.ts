import { describe, expect, it } from "vitest";

import { createTestModule, createTestProject } from "../../test/moduleFixtures";
import { CircuitLayout } from "../circuit/circuitLayout";
import { ModuleCatalog } from "../circuit/modules/moduleCatalog";
import { createModuleInstance } from "../circuit/modules/moduleDefinition";
import { defaultComponentRegistry } from "../circuit/components/builtInComponents";
import {
    loadProjectDocument,
    createProjectDocument,
} from "./serialization/projectDocument";
import { updateProjectModules } from "./updateProjectModules";

describe("updateProjectModules", () => {
    it("adds definitions without mutating the original project", () => {
        const original = createTestProject();
        const project = updateProjectModules(original, [createTestModule()]);
        expect(original.modules).toEqual([]);
        expect(original.circuit.registry).toBe(defaultComponentRegistry);
        expect(project.modules).toHaveLength(1);
        expect(project.circuit.registry).toBeInstanceOf(ModuleCatalog);
        expect(project.circuit.registry.has("module:inverter")).toBe(true);
        expect(project.annotations).toBe(original.annotations);
        expect(project.viewport).toBe(original.viewport);
    });

    it("returns the original project for an unchanged definitions array", () => {
        const project = createTestProject();
        expect(updateProjectModules(project, project.modules)).toBe(project);
    });

    it("does not retain old definitions after removing an unused module", () => {
        const original = updateProjectModules(createTestProject(), [
            createTestModule(),
        ]);
        const project = updateProjectModules(original, []);
        expect(project.modules).toEqual([]);
        expect(project.circuit.registry.has("module:inverter")).toBe(false);
        expect(project.circuit.registry.has("wire")).toBe(true);
        expect(original.modules).toHaveLength(1);
    });

    it("updates every instance against a shared definition", () => {
        const original = updateProjectModules(createTestProject(), [
            createTestModule(),
        ]);
        const project = {
            ...original,
            circuit: CircuitLayout.from(
                {
                    width: 12,
                    height: 12,
                    components: [
                        createModuleInstance("inverter", {
                            id: "a",
                            position: { x: 0, y: 0 },
                            rotation: 0,
                            layer: 0,
                        }),
                        createModuleInstance("inverter", {
                            id: "b",
                            position: { x: 6, y: 0 },
                            rotation: 0,
                            layer: 0,
                        }),
                    ],
                },
                original.circuit.registry,
            ),
        };
        const updated = updateProjectModules(project, [
            createTestModule({
                name: "Renamed",
                footprint: { width: 4, height: 3 },
            }),
        ]);
        expect(updated.modules[0].name).toBe("Renamed");
        expect(updated.circuit.getComponentAt({ x: 3, y: 2 })?.id).toBe("a");
        expect(updated.circuit.getComponentAt({ x: 9, y: 2 })?.id).toBe("b");
        expect(project.circuit.getComponentAt({ x: 3, y: 2 })).toBeUndefined();
    });

    it("rejects removing a definition still referenced by an instance", () => {
        const original = updateProjectModules(createTestProject(), [
            createTestModule(),
        ]);
        const project = {
            ...original,
            circuit: original.circuit.withComponent(
                createModuleInstance("inverter", {
                    id: "a",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    layer: 0,
                }),
            ),
        };
        expect(() => updateProjectModules(project, [])).toThrow(
            "Unknown module",
        );
        expect(project.modules).toHaveLength(1);
        expect(project.circuit.getComponentAt({ x: 2, y: 2 })?.id).toBe("a");
    });

    it("rejects a definition update whose footprint collides with another component", () => {
        const original = updateProjectModules(createTestProject(), [
            createTestModule(),
        ]);
        const project = {
            ...original,
            circuit: original.circuit
                .withComponent(
                    createModuleInstance("inverter", {
                        id: "a",
                        position: { x: 0, y: 0 },
                        rotation: 0,
                        layer: 0,
                    }),
                )
                .withComponent({
                    id: "wire",
                    type: "wire",
                    position: { x: 3, y: 1 },
                    rotation: 0,
                    layer: 0,
                }),
        };
        expect(() =>
            updateProjectModules(project, [
                createTestModule({
                    footprint: { width: 4, height: 3 },
                }),
            ]),
        ).toThrow("Multiple components occupy position");
        expect(project.modules[0].footprint.width).toBe(3);
        expect(project.circuit.getComponentAt({ x: 3, y: 1 })?.id).toBe("wire");
    });

    it("initializes legacy projects with an empty module library", () => {
        const document = createProjectDocument(
            createTestProject(),
            defaultComponentRegistry,
        );
        expect(
            loadProjectDocument(document, defaultComponentRegistry).modules,
        ).toEqual([]);
    });

    it("saves an unused module library in project format v3", () => {
        const project = updateProjectModules(createTestProject(), [
            createTestModule(),
        ]);
        const document = createProjectDocument(
            project,
            defaultComponentRegistry,
        );
        expect(document.version).toBe(3);
        expect(document.modules).toHaveLength(1);
        expect(document.modules[0].id).toBe("inverter");
    });
});
