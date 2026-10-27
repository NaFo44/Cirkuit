import { describe, expect, it } from "vitest";
import { createTestModule } from "../../../test/moduleFixtures";
import { CircuitLayout } from "../circuitLayout";
import { resolvePortGeometry } from "../componentGeometry";
import { defaultComponentRegistry } from "../components/builtInComponents";
import {
    DIRECTION_OFFSETS,
    oppositeDirection,
    rotateDirection,
    type Direction,
} from "../direction";
import { ModuleCatalog } from "../modules/moduleCatalog";
import { createModuleInstance } from "../modules/moduleDefinition";
import {
    CIRCUIT_LAYERS,
    ROTATIONS,
    type CircuitLayer,
} from "../placedComponent";
import {
    createSimulation,
    getPortSignal,
} from "../simulation/simulationEngine";
import { compileNetlist } from "./compileNetlist";
import { portKey } from "./netlist";

const corners = [
    { name: "top left", side: "west", offset: 0, exposed: ["west", "north"] },
    { name: "top right", side: "east", offset: 0, exposed: ["east", "north"] },
    {
        name: "bottom right",
        side: "east",
        offset: 2,
        exposed: ["east", "south"],
    },
    {
        name: "bottom left",
        side: "west",
        offset: 2,
        exposed: ["west", "south"],
    },
] as const;

function moduleWithPin(
    corner: (typeof corners)[number],
    footprint = { width: 4, height: 3 },
) {
    return createTestModule({
        footprint,
        ports: [
            {
                id: "pin",
                name: "PIN",
                kind: "inout",
                side: corner.side,
                offset: corner.offset,
                internalPort: { componentId: "wire", portId: "north" },
            },
        ],
        circuit: {
            width: 1,
            height: 1,
            components: [
                {
                    id: "wire",
                    type: "wire",
                    position: { x: 0, y: 0 },
                    layer: 0,
                    rotation: 0,
                },
            ],
        },
    });
}

const cases = corners.flatMap((corner) =>
    ROTATIONS.flatMap((rotation) =>
        CIRCUIT_LAYERS.map((layer) => ({ corner, rotation, layer })),
    ),
);

describe("module pin cell connections", () => {
    it("propagates a conflict between the two exposed sides of a corner pin", () => {
        const original = createTestModule();
        const definition = createTestModule({
            footprint: { width: 4, height: 3 },
            ports: original.ports.map((port) =>
                port.id === "q" ? { ...port, offset: 0 } : port,
            ),
        });
        const registry = new ModuleCatalog([definition]);
        const circuit = CircuitLayout.from(
            {
                width: 10,
                height: 10,
                components: [
                    createModuleInstance(definition.id, {
                        id: "instance",
                        position: { x: 2, y: 2 },
                        rotation: 0,
                        layer: 0,
                    }),
                    {
                        id: "input-source",
                        type: "source",
                        position: { x: 1, y: 3 },
                        rotation: 0,
                        layer: 0,
                    },
                    {
                        id: "corner-source",
                        type: "source",
                        position: { x: 5, y: 1 },
                        rotation: 0,
                        layer: 0,
                    },
                    {
                        id: "east-light",
                        type: "light",
                        position: { x: 6, y: 2 },
                        rotation: 0,
                        layer: 0,
                    },
                ],
            },
            registry,
        );
        const simulation = createSimulation(circuit, defaultComponentRegistry, [
            definition,
        ]);
        expect(getPortSignal(simulation, "instance", "q")).toBe("conflict");
        expect(getPortSignal(simulation, "corner-source", "south")).toBe(
            "conflict",
        );
        expect(getPortSignal(simulation, "east-light", "west")).toBe(
            "conflict",
        );
    });

    it.each(cases)(
        "connects both sides of $corner.name at rotation $rotation on layer $layer",
        ({ corner, rotation, layer }) => {
            const definition = moduleWithPin(corner);
            const registry = new ModuleCatalog([definition]);
            const instance = createModuleInstance(definition.id, {
                id: "instance",
                position: { x: 3, y: 3 },
                rotation,
                layer,
            });
            const pin = resolvePortGeometry(
                instance,
                registry.get(instance.type),
                definition.ports[0],
            );
            const exposed = corner.exposed.map((side) =>
                rotateDirection(side, rotation),
            );
            const neighbours = exposed.map((side) => ({
                id: side,
                type: "wire",
                position: {
                    x: pin.position.x + DIRECTION_OFFSETS[side].x,
                    y: pin.position.y + DIRECTION_OFFSETS[side].y,
                },
                rotation: 0 as const,
                layer,
            }));
            const circuit = CircuitLayout.from(
                {
                    width: 12,
                    height: 12,
                    components: [instance, ...neighbours],
                },
                registry,
            );
            const netlist = compileNetlist(circuit, registry);
            const reference = { componentId: instance.id, portId: "pin" };
            const pinNet = netlist.netByPort.get(portKey(reference));
            for (const side of exposed) {
                expect(
                    netlist.netByPort.get(
                        portKey({
                            componentId: side,
                            portId: oppositeDirection(side),
                        }),
                    ),
                ).toBe(pinNet);
            }
            const net = netlist.nets.find((net) => net.id === pinNet)!;
            expect(
                net.ports.filter((port) => port.componentId === instance.id),
            ).toEqual([reference]);
            expect(net.drivers).toEqual([reference]);
            expect(net.readers).toEqual([reference]);
        },
    );

    it.each(CIRCUIT_LAYERS)(
        "keeps both exposed sides isolated from the opposite layer of %s",
        (layer) => {
            const definition = moduleWithPin(corners[0]);
            const registry = new ModuleCatalog([definition]);
            const instance = createModuleInstance(definition.id, {
                id: "instance",
                position: { x: 3, y: 3 },
                rotation: 0,
                layer,
            });
            const circuit = CircuitLayout.from(
                {
                    width: 8,
                    height: 8,
                    components: [
                        instance,
                        {
                            id: "west",
                            type: "wire",
                            position: { x: 2, y: 3 },
                            rotation: 0,
                            layer: (1 - layer) as CircuitLayer,
                        },
                        {
                            id: "north",
                            type: "wire",
                            position: { x: 3, y: 2 },
                            rotation: 0,
                            layer: (1 - layer) as CircuitLayer,
                        },
                    ],
                },
                registry,
            );
            const netlist = compileNetlist(circuit, registry);
            const pinNet = netlist.netByPort.get(
                portKey({ componentId: instance.id, portId: "pin" }),
            );
            for (const side of ["west", "north"] as const)
                expect(
                    netlist.netByPort.get(
                        portKey({
                            componentId: side,
                            portId: oppositeDirection(side),
                        }),
                    ),
                ).not.toBe(pinNet);
        },
    );

    it("connects all four exposed sides of a one-cell module", () => {
        const definition = moduleWithPin(corners[0], { width: 1, height: 1 });
        const registry = new ModuleCatalog([definition]);
        const instance = createModuleInstance(definition.id, {
            id: "instance",
            position: { x: 3, y: 3 },
            rotation: 0,
            layer: 0,
        });
        const sides: Direction[] = ["west", "east", "north", "south"];
        const neighbours = sides.map((side) => ({
            id: side,
            type: "wire",
            position: {
                x: 3 + DIRECTION_OFFSETS[side].x,
                y: 3 + DIRECTION_OFFSETS[side].y,
            },
            rotation: 0 as const,
            layer: 0 as const,
        }));
        const circuit = CircuitLayout.from(
            { width: 8, height: 8, components: [instance, ...neighbours] },
            registry,
        );
        const netlist = compileNetlist(circuit, registry);
        expect(new Set([...netlist.netByPort.values()]).size).toBe(1);
        expect(
            netlist.nets[0].ports.filter(
                (port) => port.componentId === instance.id,
            ),
        ).toHaveLength(1);
    });

    it("preserves directional connections for primitive gates", () => {
        const circuit = CircuitLayout.empty(6, 6)
            .withComponent({
                id: "gate",
                type: "not",
                position: { x: 2, y: 2 },
                rotation: 0,
                layer: 0,
            })
            .withComponent({
                id: "wire",
                type: "wire",
                position: { x: 2, y: 1 },
                rotation: 0,
                layer: 0,
            });
        const netlist = compileNetlist(circuit, defaultComponentRegistry);
        expect(
            netlist.netByPort.get(
                portKey({ componentId: "wire", portId: "south" }),
            ),
        ).not.toBe(
            netlist.netByPort.get(
                portKey({ componentId: "gate", portId: "input" }),
            ),
        );
    });

    it.each([false, true])(
        "propagates a corner output on both sides when the input is driven: %s",
        (driven) => {
            const original = createTestModule();
            const definition = createTestModule({
                footprint: { width: 4, height: 3 },
                ports: original.ports.map((port) =>
                    port.id === "q" ? { ...port, offset: 0 } : port,
                ),
            });
            const registry = new ModuleCatalog([definition]);
            const circuit = CircuitLayout.from(
                {
                    width: 10,
                    height: 10,
                    components: [
                        createModuleInstance(definition.id, {
                            id: "instance",
                            position: { x: 2, y: 2 },
                            rotation: 0,
                            layer: 0,
                        }),
                        {
                            id: "north-light",
                            type: "light",
                            position: { x: 5, y: 1 },
                            rotation: 0,
                            layer: 0,
                        },
                        {
                            id: "east-light",
                            type: "light",
                            position: { x: 6, y: 2 },
                            rotation: 0,
                            layer: 0,
                        },
                        ...(driven
                            ? [
                                  {
                                      id: "source",
                                      type: "source",
                                      position: { x: 1, y: 3 },
                                      rotation: 0 as const,
                                      layer: 0 as const,
                                  },
                              ]
                            : []),
                    ],
                },
                registry,
            );
            const simulation = createSimulation(
                circuit,
                defaultComponentRegistry,
                [definition],
            );
            const expected = driven ? "low" : "high";
            expect(getPortSignal(simulation, "instance", "q")).toBe(expected);
            expect(getPortSignal(simulation, "north-light", "south")).toBe(
                expected,
            );
            expect(getPortSignal(simulation, "east-light", "west")).toBe(
                expected,
            );
        },
    );
});
