import { describe, expect, it } from "vitest";

import {
    createTestModule,
    createTestProject,
} from "../../../test/moduleFixtures";
import { createTestDocumentV3 } from "../../../test/projectDocumentFixtures";
import { CircuitLayout } from "../../circuit/circuitLayout";
import { defaultComponentRegistry } from "../../circuit/components/builtInComponents";
import { ModuleCatalog } from "../../circuit/modules/moduleCatalog";
import { createModuleInstance } from "../../circuit/modules/moduleDefinition";
import type { CircuitAnnotation } from "../circuitAnnotation";
import type { CircuitProject } from "../circuitProject";
import {
    createProjectDocument,
    loadProjectDocument,
    serializeProjectDocument,
} from "./projectDocument";

const registry = defaultComponentRegistry;
const annotations: readonly CircuitAnnotation[] = [
    {
        id: "label",
        kind: "label",
        position: { x: 20, y: 40 },
        text: "Internal label",
    },
    {
        id: "line",
        kind: "line",
        start: { x: 0, y: 20 },
        end: { x: 40, y: 60 },
    },
    {
        id: "rectangle",
        kind: "rectangle",
        position: { x: 20, y: 0 },
        width: 60,
        height: 40,
    },
];

function projectWithModules(): CircuitProject {
    const catalog = new ModuleCatalog([createTestModule({ annotations })]);
    return {
        ...createTestProject(),
        modules: catalog.modules,
        circuit: CircuitLayout.from(
            {
                width: 12,
                height: 12,
                components: [
                    createModuleInstance("inverter", {
                        id: "one",
                        position: { x: 1, y: 1 },
                        rotation: 0,
                        layer: 0,
                    }),
                    createModuleInstance("inverter", {
                        id: "two",
                        position: { x: 6, y: 1 },
                        rotation: 90,
                        layer: 1,
                    }),
                ],
            },
            catalog,
        ),
    };
}

describe("module project document export", () => {
    it("writes a definition once while preserving references from multiple instances", () => {
        const document = createProjectDocument(projectWithModules(), registry);
        expect(document.version).toBe(3);
        expect(document.modules).toHaveLength(1);
        expect(document.modules[0].id).toBe("inverter");
        expect(
            document.circuit.components.map((component) => component.type),
        ).toEqual(["module:inverter", "module:inverter"]);
        expect(document.circuit.components[1]).toMatchObject({
            id: "two",
            rotation: 90,
            layer: 1,
        });
    });

    it("preserves unused definitions in a library-only project", () => {
        const project = projectWithModules();
        const document = createProjectDocument(
            {
                ...project,
                circuit: CircuitLayout.empty(12, 12),
            },
            registry,
        );
        expect(document.circuit.components).toEqual([]);
        expect(document.modules).toHaveLength(1);
    });

    it("stores module annotations in grid coordinates", () => {
        const document = createProjectDocument(projectWithModules(), registry);
        expect(document.modules[0].annotations).toEqual({
            coordinateSpace: "grid",
            items: [
                {
                    id: "label",
                    kind: "label",
                    position: { x: 1, y: 2 },
                    text: "Internal label",
                },
                {
                    id: "line",
                    kind: "line",
                    start: { x: 0, y: 1 },
                    end: { x: 2, y: 3 },
                },
                {
                    id: "rectangle",
                    kind: "rectangle",
                    position: { x: 1, y: 0 },
                    width: 3,
                    height: 2,
                },
            ],
        });
    });

    it("serializes declarative data without runtime registries or simulation state", () => {
        const project = projectWithModules();
        const document = createProjectDocument(project, registry);
        const serialized = serializeProjectDocument(project, registry);
        expect(Object.keys(document.modules[0]).sort()).toEqual([
            "annotations",
            "circuit",
            "footprint",
            "id",
            "name",
            "ports",
        ]);
        expect(Object.keys(document.modules[0].circuit).sort()).toEqual([
            "components",
            "height",
            "width",
        ]);
        expect(serialized).not.toContain('"registry"');
        expect(serialized).not.toContain('"computeOutputs"');
        expect(serialized).not.toContain('"componentStates"');
    });

    it("validates exported references using the same rules as imports", () => {
        const project = projectWithModules();
        const definition = project.modules[0];
        expect(() =>
            createProjectDocument(
                {
                    ...project,
                    modules: [
                        {
                            ...definition,
                            ports: [
                                {
                                    ...definition.ports[0],
                                    internalPort: {
                                        componentId: "missing",
                                        portId: "input",
                                    },
                                },
                            ],
                        },
                    ],
                },
                registry,
            ),
        ).toThrow("Unknown internal component");
    });

    it("does not mutate the input project", () => {
        const project = projectWithModules();
        const modules = structuredClone(project.modules);
        const components = structuredClone(project.circuit.components);
        createProjectDocument(project, registry);
        expect(project.modules).toEqual(modules);
        expect(project.circuit.components).toEqual(components);
    });
});

describe("module project document import", () => {
    it("rebuilds the catalog and indexes the rotated footprint", () => {
        const document = createTestDocumentV3();
        const project = loadProjectDocument(document, registry);
        expect(project.modules).toHaveLength(1);
        expect(project.circuit.registry).toBeInstanceOf(ModuleCatalog);
        expect(project.circuit.registry.get("module:inverter").ports).toEqual(
            document.modules[0].ports,
        );
        expect(project.circuit.getComponentAt({ x: 4, y: 4 }, 1)?.id).toBe(
            "module-1",
        );
        expect(
            project.circuit.getComponentAt({ x: 4, y: 4 }, 0),
        ).toBeUndefined();
        expect(project.viewport).toEqual(document.viewport);
    });

    it("restores internal annotations in canvas coordinates", () => {
        const document = createTestDocumentV3();
        document.modules[0].annotations.items = [
            {
                id: "label",
                kind: "label",
                position: { x: 1, y: 2 },
                text: "Internal label",
            },
            {
                id: "line",
                kind: "line",
                start: { x: 0, y: 1 },
                end: { x: 2, y: 3 },
            },
            {
                id: "rectangle",
                kind: "rectangle",
                position: { x: 1, y: 0 },
                width: 3,
                height: 2,
            },
        ];
        expect(
            loadProjectDocument(document, registry).modules[0].annotations,
        ).toEqual(annotations);
    });

    it("preserves independent internal layers", () => {
        const document = createTestDocumentV3();
        document.modules[0].circuit.components[0].layer = 1;
        const project = loadProjectDocument(document, registry);
        expect(project.modules[0].circuit.components[0].layer).toBe(1);
        expect(project.circuit.components[0].layer).toBe(1);
        expect(project.circuit.components[0].rotation).toBe(90);
    });

    it("allows annotation ids to be reused in different circuit scopes", () => {
        const document = createTestDocumentV3();
        const annotation = {
            id: "shared",
            kind: "label" as const,
            position: { x: 0, y: 0 },
            text: "Label",
        };
        document.annotations.items = [annotation];
        document.modules[0].annotations.items = [annotation];
        const project = loadProjectDocument(document, registry);
        expect(project.annotations[0].id).toBe("shared");
        expect(project.modules[0].annotations[0].id).toBe("shared");
    });

    it("rejects duplicate module ids", () => {
        const document = createTestDocumentV3();
        document.modules.push(structuredClone(document.modules[0]));
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Duplicate module id",
        );
    });

    it("rejects an instance referencing a missing definition", () => {
        const document = createTestDocumentV3();
        document.circuit.components[0].type = "module:missing";
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Unknown component type",
        );
    });

    it.each([
        { componentId: "missing", portId: "input" },
        { componentId: "not-1", portId: "missing" },
    ])("rejects an invalid internal reference %j", (internalPort) => {
        const document = createTestDocumentV3();
        document.modules[0].ports[0].internalPort = internalPort;
        expect(() => loadProjectDocument(document, registry)).toThrow(
            /Unknown internal (component|port)/,
        );
    });

    it("rejects nested modules", () => {
        const document = createTestDocumentV3();
        document.modules[0].circuit.components[0].type = "module:inverter";
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Nested modules are not supported",
        );
    });

    it("rejects unknown primitive types inside a module", () => {
        const document = createTestDocumentV3();
        document.modules[0].circuit.components[0].type = "unknown";
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Unknown component type",
        );
    });

    it("rejects duplicate public port ids", () => {
        const document = createTestDocumentV3();
        document.modules[0].ports[1].id = document.modules[0].ports[0].id;
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Duplicated port id",
        );
    });

    it("rejects public ports occupying the same edge position", () => {
        const document = createTestDocumentV3();
        document.modules[0].ports[1].side = "west";
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Duplicated port side",
        );
    });

    it("rejects overlapping internal components", () => {
        const document = createTestDocumentV3();
        document.modules[0].circuit.components.push({
            ...document.modules[0].circuit.components[0],
            id: "other",
        });
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Multiple components occupy position",
        );
    });

    it("rejects an internal component outside its circuit", () => {
        const document = createTestDocumentV3();
        document.modules[0].circuit.components[0].position.x = 4;
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Component is outside the layout",
        );
    });

    it("rejects overlap at the far edge of an instance footprint", () => {
        const document = createTestDocumentV3();
        document.circuit.components.push({
            id: "wire",
            type: "wire",
            position: { x: 4, y: 4 },
            rotation: 0,
            layer: 1,
        });
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Multiple components occupy position 4,4 on layer 1",
        );
    });

    it("rejects an instance extending outside the parent grid", () => {
        const document = createTestDocumentV3();
        document.circuit.components[0].position.x = 11;
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "Component is outside the layout",
        );
    });

    it("rejects internal annotation coordinates overflowing canvas units", () => {
        const document = createTestDocumentV3();
        document.modules[0].annotations.items = [
            {
                id: "label",
                kind: "label",
                text: "Label",
                position: { x: Number.MAX_VALUE, y: 0 },
            },
        ];
        expect(() => loadProjectDocument(document, registry)).toThrow(
            "outside the supported range",
        );
    });

    it("does not mutate the imported document", () => {
        const document = createTestDocumentV3();
        const before = structuredClone(document);
        loadProjectDocument(document, registry);
        expect(document).toEqual(before);
    });
});
