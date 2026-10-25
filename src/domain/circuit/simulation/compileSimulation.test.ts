import { describe, expect, it } from "vitest";

import { createTestModule } from "../../../test/moduleFixtures";
import type { Circuit } from "../circuit";
import { defaultComponentRegistry } from "../components/builtInComponents";
import { resolvePortGeometry } from "../componentGeometry";
import { DIRECTION_OFFSETS, oppositeDirection } from "../direction";
import { ModuleCatalog } from "../modules/moduleCatalog";
import {
    createModuleInstance,
    type ModuleDefinition,
} from "../modules/moduleDefinition";
import { compileNetlist } from "../netlist/compileNetlist";
import { portKey, type Netlist } from "../netlist/netlist";
import type { CircuitLayer, PlacedComponent } from "../placedComponent";
import { compileSimulation } from "./compileSimulation";

const registry = defaultComponentRegistry;

function circuit(components: readonly PlacedComponent[]): Circuit {
    return { width: 20, height: 20, components };
}

function wire(
    id: string,
    x: number,
    y: number,
    layer: CircuitLayer = 0,
): PlacedComponent {
    return { id, type: "wire", position: { x, y }, rotation: 0, layer };
}

function instance(id = "module-1", moduleId = "inverter", x = 2, y = 2) {
    return createModuleInstance(moduleId, {
        id,
        position: { x, y },
        rotation: 0,
        layer: 0,
    });
}

function netId(netlist: Netlist, componentId: string, portId: string): string {
    const id = netlist.netByPort.get(portKey({ componentId, portId }));
    if (id === undefined) {
        throw new Error(`Missing test port: ${componentId}/${portId}`);
    }
    return id;
}

function bridge(): ModuleDefinition {
    return createTestModule({
        id: "bridge",
        name: "Bridge",
        circuit: { width: 1, height: 1, components: [wire("inner", 0, 0)] },
        ports: [
            {
                id: "a",
                name: "A",
                kind: "input",
                side: "west",
                offset: 1,
                internalPort: { componentId: "inner", portId: "west" },
            },
            {
                id: "q",
                name: "Q",
                kind: "output",
                side: "east",
                offset: 1,
                internalPort: { componentId: "inner", portId: "east" },
            },
        ],
    });
}

describe("compileSimulation", () => {
    it("preserves primitive circuits and their existing netlist", () => {
        const original = circuit([wire("a", 0, 0), wire("b", 1, 0)]);
        const compiled = compileSimulation(original, registry);

        expect(compiled.components).toBe(original.components);
        expect(compiled.netlist).toEqual(compileNetlist(original, registry));
        expect(compiled.moduleComponents.size).toBe(0);
    });

    it("accepts an empty circuit", () => {
        const compiled = compileSimulation(circuit([]), registry);

        expect(compiled.components).toEqual([]);
        expect(compiled.netlist.nets).toEqual([]);
        expect(compiled.netlist.netByPort.size).toBe(0);
    });

    it("expands only instantiated definitions", () => {
        const compiled = compileSimulation(circuit([]), registry, [
            createTestModule(),
        ]);

        expect(compiled.components).toEqual([]);
        expect(compiled.moduleComponents.size).toBe(0);
    });

    it("replaces module boxes with primitive components and keeps parent ids", () => {
        const parent = wire("parent", 0, 0);
        const compiled = compileSimulation(
            circuit([parent, instance()]),
            registry,
            [createTestModule()],
        );
        const internalId = compiled.moduleComponents
            .get("module-1")
            ?.get("not-1");

        expect(internalId).toBeDefined();
        expect(compiled.components).toHaveLength(2);
        expect(compiled.components).toContain(parent);
        expect(
            compiled.components.find((part) => part.id === internalId)?.type,
        ).toBe("not");
        expect(
            compiled.components.some((part) => part.type.startsWith("module:")),
        ).toBe(false);
    });

    it("maps public ports to internal nets without adding executable terminals", () => {
        const compiled = compileSimulation(circuit([instance()]), registry, [
            createTestModule(),
        ]);
        const internalId = compiled.moduleComponents
            .get("module-1")
            ?.get("not-1");
        if (!internalId) throw new Error("Expected internal component");

        const inputId = netId(compiled.netlist, "module-1", "a");
        const outputId = netId(compiled.netlist, "module-1", "q");
        const input = compiled.netlist.nets.find((net) => net.id === inputId);
        const output = compiled.netlist.nets.find((net) => net.id === outputId);

        expect(inputId).toBe(netId(compiled.netlist, internalId, "input"));
        expect(outputId).toBe(netId(compiled.netlist, internalId, "output"));
        expect(input?.drivers).toEqual([]);
        expect(input?.readers).toEqual([
            { componentId: internalId, portId: "input" },
        ]);
        expect(output?.drivers).toEqual([
            { componentId: internalId, portId: "output" },
        ]);
        expect(output?.readers).toEqual([]);
    });

    it("preserves conductive groups and multiple public contacts on one net", () => {
        const compiled = compileSimulation(
            circuit([instance("m", "bridge")]),
            registry,
            [bridge()],
        );
        const inputId = netId(compiled.netlist, "m", "a");
        const outputId = netId(compiled.netlist, "m", "q");
        const net = compiled.netlist.nets.find(
            (candidate) => candidate.id === inputId,
        );

        expect(inputId).toBe(outputId);
        expect(net?.drivers).toEqual([]);
        expect(net?.readers).toEqual([]);
    });

    it("keeps separate instances electrically isolated", () => {
        const compiled = compileSimulation(
            circuit([
                instance("one", "bridge"),
                instance("two", "bridge", 8, 2),
            ]),
            registry,
            [bridge()],
        );

        expect(compiled.moduleComponents.get("one")?.get("inner")).not.toBe(
            compiled.moduleComponents.get("two")?.get("inner"),
        );
        expect(netId(compiled.netlist, "one", "a")).not.toBe(
            netId(compiled.netlist, "two", "a"),
        );
        expect(new Set(compiled.components.map((part) => part.id)).size).toBe(
            2,
        );
    });

    it("avoids collisions between generated internal ids and parent ids", () => {
        const occupiedId = '@["module-1","not-1"]';
        const parent = wire(occupiedId, 0, 0);
        const compiled = compileSimulation(
            circuit([parent, instance()]),
            registry,
            [createTestModule()],
        );
        const internalId = compiled.moduleComponents
            .get("module-1")
            ?.get("not-1");

        expect(internalId).toBeDefined();
        expect(internalId).not.toBe(occupiedId);
        expect(compiled.components).toContain(parent);
        expect(new Set(compiled.components.map((part) => part.id)).size).toBe(
            2,
        );
    });

    it.each([0, 90, 180, 270] as const)(
        "connects public port positions at rotation %i on either layer",
        (rotation) => {
            const definition = createTestModule();
            const descriptor = new ModuleCatalog([definition]).get(
                "module:inverter",
            );

            for (const layer of [0, 1] as const) {
                const placed = createModuleInstance("inverter", {
                    id: "m",
                    position: { x: 8, y: 8 },
                    rotation,
                    layer,
                });
                const input = resolvePortGeometry(
                    placed,
                    descriptor,
                    descriptor.ports[0],
                );
                const output = resolvePortGeometry(
                    placed,
                    descriptor,
                    descriptor.ports[1],
                );
                const inputOffset = DIRECTION_OFFSETS[input.side];
                const outputOffset = DIRECTION_OFFSETS[output.side];
                const compiled = compileSimulation(
                    circuit([
                        placed,
                        wire(
                            "in",
                            input.position.x + inputOffset.x,
                            input.position.y + inputOffset.y,
                            layer,
                        ),
                        wire(
                            "out",
                            output.position.x + outputOffset.x,
                            output.position.y + outputOffset.y,
                            layer,
                        ),
                    ]),
                    registry,
                    [definition],
                );

                expect(netId(compiled.netlist, "m", "a")).toBe(
                    netId(
                        compiled.netlist,
                        "in",
                        oppositeDirection(input.side),
                    ),
                );
                expect(netId(compiled.netlist, "m", "q")).toBe(
                    netId(
                        compiled.netlist,
                        "out",
                        oppositeDirection(output.side),
                    ),
                );
            }
        },
    );

    it("keeps internal geometry local even when parent cells overlap its coordinates", () => {
        const definition = createTestModule({
            circuit: {
                width: 4,
                height: 4,
                components: [
                    {
                        id: "not-1",
                        type: "not",
                        position: { x: 1, y: 1 },
                        rotation: 90,
                        layer: 1,
                    },
                ],
            },
        });
        const compiled = compileSimulation(
            circuit([wire("parent", 1, 1, 1), instance()]),
            registry,
            [definition],
        );
        const id = compiled.moduleComponents.get("module-1")?.get("not-1");

        expect(
            compiled.components.find((part) => part.id === id),
        ).toMatchObject({
            position: { x: 1, y: 1 },
            rotation: 90,
            layer: 1,
        });
        expect(compiled.components).toHaveLength(2);
    });

    it("does not connect a parent wire on the opposite layer", () => {
        const compiled = compileSimulation(
            circuit([instance(), wire("opposite", 1, 3, 1)]),
            registry,
            [createTestModule()],
        );

        expect(netId(compiled.netlist, "module-1", "a")).not.toBe(
            netId(compiled.netlist, "opposite", "east"),
        );
    });

    it("produces the same netlist regardless of parent component order", () => {
        const parts = [
            wire("input", 1, 3),
            instance("one"),
            instance("two", "inverter", 8, 2),
        ];
        const definitions = [createTestModule()];
        const first = compileSimulation(circuit(parts), registry, definitions);
        const reversed = compileSimulation(
            circuit([...parts].reverse()),
            registry,
            definitions,
        );

        expect(reversed.netlist).toEqual(first.netlist);
        expect(reversed.moduleComponents).toEqual(first.moduleComponents);
    });

    it("does not mutate the circuit or module definition", () => {
        const definition = createTestModule();
        const original = circuit([instance()]);
        const before = structuredClone({ definition, original });

        compileSimulation(original, registry, [definition]);

        expect({ definition, original }).toEqual(before);
    });

    it("rejects a missing module definition", () => {
        expect(() =>
            compileSimulation(circuit([instance()]), registry),
        ).toThrow("Unknown component type");
    });
});
