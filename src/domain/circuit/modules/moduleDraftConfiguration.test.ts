import { describe, expect, it } from "vitest";

import { createModuleDraftProject, type ModuleDraft } from "./moduleDraft";
import {
    createModuleDefinitionFromDraft,
    findFreeDraftPortSlot,
    getDraftBodyError,
    getModuleDraftError,
    getModuleWireReference,
    hasModuleInternalPort,
    suggestDraftPortName,
} from "./moduleDraftConfiguration";
import { createTestProject } from "../../../test/moduleFixtures";
import { updateProjectModules } from "../../project/updateProjectModules";
import {
    createProjectDocument,
    loadProjectDocument,
} from "../../project/serialization/projectDocument";
import { defaultComponentRegistry } from "../components/builtInComponents";
import { CircuitLayout } from "../circuitLayout";
import { createModuleInstance } from "./moduleDefinition";
import {
    createSimulation,
    getPortSignal,
} from "../simulation/simulationEngine";

function fixture() {
    const initial = createModuleDraftProject();
    const project = {
        ...initial,
        circuit: initial.circuit.withComponent({
            id: "gate",
            type: "not",
            position: { x: 1, y: 1 },
            rotation: 0,
            layer: 1,
        }),
        annotations: [
            {
                id: "label",
                kind: "label" as const,
                position: { x: 20, y: 40 },
                text: "Private",
            },
        ],
    };
    const draft: ModuleDraft = {
        id: "draft",
        name: " NOT ",
        footprint: { width: 5, height: 5 },
        ports: [
            {
                id: "a",
                name: " A ",
                kind: "input",
                side: "west",
                offset: 1,
                internalPort: { componentId: "gate", portId: "input" },
            },
            {
                id: "y",
                name: "Y",
                kind: "output",
                side: "east",
                offset: 1,
                internalPort: { componentId: "gate", portId: "output" },
            },
        ],
    };
    return { project, draft };
}

describe("module draft configuration", () => {
    it("suggests free input and output cells without mutating the draft", () => {
        const { draft } = fixture();
        const empty = { ...draft, ports: [] };
        expect(findFreeDraftPortSlot(empty, "input")).toEqual({
            side: "west",
            offset: 1,
        });
        expect(findFreeDraftPortSlot(empty, "output")).toEqual({
            side: "east",
            offset: 1,
        });
        expect(empty.ports).toEqual([]);
        expect(findFreeDraftPortSlot(draft, "input")).toEqual({
            side: "west",
            offset: 2,
        });
    });

    it("counts corner cells once when the perimeter is full", () => {
        const { draft } = fixture();
        const full = {
            ...draft,
            footprint: { width: 1, height: 1 },
            ports: [{ ...draft.ports[0], offset: 0 }],
        };
        expect(findFreeDraftPortSlot(full, "input")).toBeNull();
        expect(findFreeDraftPortSlot(full, "output")).toBeNull();
    });

    it.each([0, -1, 1.5, 33, NaN, Infinity])(
        "rejects an invalid body dimension %s",
        (size) => {
            expect(
                getDraftBodyError({ width: size, height: 5 }, []),
            ).not.toBeNull();
        },
    );

    it("rejects shrinking past a port and new corner collisions", () => {
        const { draft } = fixture();
        expect(
            getDraftBodyError({ width: 5, height: 1 }, draft.ports),
        ).toContain("shrinking");
        const ports = [
            { ...draft.ports[0], side: "north" as const, offset: 0 },
            { ...draft.ports[1], side: "west" as const, offset: 0 },
        ];
        expect(getDraftBodyError(draft.footprint, ports)).toContain(
            "same cell",
        );
        expect(
            getDraftBodyError({ width: 7, height: 6 }, draft.ports),
        ).toBeNull();
    });

    it("recognizes internal connections on either internal layer", () => {
        const { project } = fixture();
        expect(
            hasModuleInternalPort(project.circuit, {
                componentId: "gate",
                portId: "input",
            }),
        ).toBe(true);
        expect(
            hasModuleInternalPort(project.circuit, {
                componentId: "gate",
                portId: "missing",
            }),
        ).toBe(false);
        expect(
            hasModuleInternalPort(project.circuit, {
                componentId: "missing",
                portId: "input",
            }),
        ).toBe(false);
    });

    it("suggests names that do not duplicate existing port names", () => {
        const { draft } = fixture();
        const named = {
            ...draft,
            ports: draft.ports.map((port) => ({
                ...port,
                name: port.name.trim(),
            })),
        };
        expect(suggestDraftPortName(named, "input")).toBe("B");
        expect(suggestDraftPortName(named, "output")).toBe("Z");
    });

    it("keeps missing bindings invalid until the internal component is restored", () => {
        const { project, draft } = fixture();
        const removed = {
            ...project,
            circuit: project.circuit.withoutComponents(new Set(["gate"])),
        };
        expect(getModuleDraftError(draft, removed)).not.toBeNull();
        expect(getModuleDraftError(draft, project)).toBeNull();
    });

    it("rejects empty names and circuits without exposed ports", () => {
        const { draft, project } = fixture();
        expect(getModuleDraftError({ ...draft, name: " " }, project)).toContain(
            "name",
        );
        expect(getModuleDraftError({ ...draft, ports: [] }, project)).toContain(
            "Expose",
        );
        expect(
            getModuleDraftError(
                { ...draft, ports: [{ ...draft.ports[0], name: " " }] },
                project,
            ),
        ).toContain("name");
    });

    it("creates an independent definition and preserves private annotations", () => {
        const { draft, project } = fixture();
        const definition = createModuleDefinitionFromDraft(draft, project);
        expect(definition.name).toBe("NOT");
        expect(definition.ports[0].name).toBe("A");
        expect(definition.ports[0].internalPort).not.toBe(
            draft.ports[0].internalPort,
        );
        expect(definition.annotations).toEqual(project.annotations);
        expect(definition.annotations).not.toBe(project.annotations);
        expect(definition.circuit.components[0].layer).toBe(1);
        expect(definition.circuit.components[0].position).not.toBe(
            project.circuit.components[0].position,
        );
        expect(draft.name).toBe(" NOT ");
    });

    it("exports, restores and simulates the created module with public ports", () => {
        const { draft, project: original } = fixture();
        const project = {
            ...original,
            circuit: original.circuit
                .withComponent({
                    id: "input-wire",
                    type: "wire",
                    position: { x: 0, y: 1 },
                    layer: 1,
                    rotation: 0,
                })
                .withComponent({
                    id: "output-wire",
                    type: "wire",
                    position: { x: 2, y: 1 },
                    layer: 1,
                    rotation: 90,
                }),
        };
        const definition = createModuleDefinitionFromDraft(
            {
                ...draft,
                ports: draft.ports.map((port) => ({
                    ...port,
                    internalPort: getModuleWireReference(
                        project.circuit,
                        port.kind === "input" ? "input-wire" : "output-wire",
                    )!,
                })),
            },
            project,
        );
        const main = updateProjectModules(createTestProject(), [definition]);
        const circuit = CircuitLayout.from(
            {
                width: 12,
                height: 12,
                components: [
                    createModuleInstance(definition.id, {
                        id: "instance",
                        position: { x: 1, y: 0 },
                        rotation: 0,
                        layer: 0,
                    }),
                    {
                        id: "source",
                        type: "source",
                        position: { x: 0, y: 1 },
                        rotation: 0,
                        layer: 0,
                    },
                ],
            },
            main.circuit.registry,
        );
        const restored = loadProjectDocument(
            createProjectDocument(
                { ...main, circuit },
                defaultComponentRegistry,
            ),
            defaultComponentRegistry,
        );
        const simulation = createSimulation(
            restored.circuit,
            defaultComponentRegistry,
            restored.modules,
        );
        expect(getPortSignal(simulation, "instance", "a")).toBe("high");
        expect(getPortSignal(simulation, "instance", "y")).toBe("low");
        expect(restored.modules[0].annotations).toEqual(project.annotations);
    });
});
