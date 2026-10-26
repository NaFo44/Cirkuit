import { describe, expect, it } from "vitest";

import { createTestModule } from "../../test/moduleFixtures";
import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import { ModuleCatalog } from "../../domain/circuit/modules/moduleCatalog";
import { createModuleInstance } from "../../domain/circuit/modules/moduleDefinition";
import { portKey } from "../../domain/circuit/netlist/netlist";
import { createProbeIndex, findProbePort } from "./createProbeIndex";

describe("module probe index", () => {
    it.each([
        [0, 40, 80],
        [90, 60, 60],
        [180, 100, 80],
        [270, 60, 120],
    ] as const)(
        "recognizes the entire module port cell at rotation %i",
        (rotation, x, y) => {
            const definition = createTestModule({
                footprint: { width: 4, height: 3 },
            });
            const catalog = new ModuleCatalog([definition]);
            const circuit = CircuitLayout.from(
                {
                    width: 12,
                    height: 12,
                    components: [
                        createModuleInstance("inverter", {
                            id: "m",
                            position: { x: 2, y: 3 },
                            rotation,
                            layer: 0,
                        }),
                    ],
                },
                catalog,
            );
            const index = createProbeIndex(circuit, [definition]);
            const port = index.portsByKey.get(
                portKey({ componentId: "m", portId: "a" }),
            );

            for (const dx of [0.1, 10, 19.9]) {
                for (const dy of [0.1, 10, 19.9]) {
                    const point = { x: x + dx, y: y + dy };
                    expect(findProbePort(index, circuit, point, 0)).toBe(port);
                    expect(findProbePort(index, circuit, point, 1)).toBeNull();
                }
            }
        },
    );

    it("uses visible rotated port positions and active layers", () => {
        const definition = createTestModule({
            footprint: { width: 4, height: 3 },
        });
        const catalog = new ModuleCatalog([definition]);
        const circuit = CircuitLayout.from(
            {
                width: 12,
                height: 12,
                components: [
                    createModuleInstance("inverter", {
                        id: "m",
                        position: { x: 2, y: 3 },
                        rotation: 90,
                        layer: 1,
                    }),
                ],
            },
            catalog,
        );
        const index = createProbeIndex(circuit, [definition]);
        const port = index.portsByKey.get(
            portKey({ componentId: "m", portId: "a" }),
        );
        expect(port).toMatchObject({
            x: 70,
            y: 62,
            layer: 1,
        });
        expect(findProbePort(index, circuit, { x: 70, y: 63 }, 1)).toBe(port);
        expect(findProbePort(index, circuit, { x: 70, y: 63 }, 0)).toBeNull();
        expect(findProbePort(index, circuit, { x: 70, y: 100 }, 1)).toBeNull();
        expect(index.portsByKey.size).toBe(2);
    });

    it("traces a passive connection through a module without exposing internal coordinates", () => {
        const wire = {
            id: "inner",
            type: "wire",
            position: { x: 0, y: 0 },
            rotation: 0 as const,
            layer: 0 as const,
        };
        const definition = createTestModule({
            circuit: { width: 1, height: 1, components: [wire] },
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
        const catalog = new ModuleCatalog([definition]);
        const circuit = CircuitLayout.from(
            {
                width: 12,
                height: 12,
                components: [
                    createModuleInstance("inverter", {
                        id: "m",
                        position: { x: 2, y: 2 },
                        rotation: 0,
                        layer: 0,
                    }),
                    { ...wire, id: "left", position: { x: 1, y: 3 } },
                    { ...wire, id: "right", position: { x: 5, y: 3 } },
                ],
            },
            catalog,
        );
        const index = createProbeIndex(circuit, [definition]);
        const left = index.netlist.netByPort.get(
            portKey({ componentId: "left", portId: "east" }),
        );
        const right = index.netlist.netByPort.get(
            portKey({ componentId: "right", portId: "west" }),
        );
        expect(left).toBeDefined();
        expect(left).toBe(right);
        expect(
            [...index.portsByKey.values()].every((port) =>
                ["m", "left", "right"].includes(port.componentId),
            ),
        ).toBe(true);
        expect(index.portsByComponent.has("inner")).toBe(false);
    });

    it("keeps vias accessible from both layers", () => {
        const circuit = CircuitLayout.from({
            width: 2,
            height: 2,
            components: [
                {
                    id: "via",
                    type: "via",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    layer: 0,
                },
            ],
        });
        const index = createProbeIndex(circuit);
        expect(index.portsByComponent.get("via")).toHaveLength(8);
        expect(findProbePort(index, circuit, { x: 10, y: 10 }, 0)?.layer).toBe(
            0,
        );
        expect(findProbePort(index, circuit, { x: 10, y: 10 }, 1)?.layer).toBe(
            1,
        );
    });
});
