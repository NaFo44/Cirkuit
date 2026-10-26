import { describe, expect, it } from "vitest";

import { createTestModule } from "../../../test/moduleFixtures";
import { CircuitLayout } from "../circuitLayout";
import { defaultComponentRegistry } from "../components/builtInComponents";
import { getOccupiedCells, resolvePortGeometry } from "../componentGeometry";
import {
    createComponentClipboard,
    pasteComponentClipboard,
} from "../componentClipboard";
import { moveComponents } from "../moveComponents";
import { ModuleCatalog } from "./moduleCatalog";
import {
    createModuleInstance,
    getModuleComponentType,
    getModuleId,
    type ModuleDefinition,
} from "./moduleDefinition";

const placement = {
    id: "instance-1",
    position: { x: 1, y: 1 },
    rotation: 0 as const,
    layer: 0 as const,
};

describe("module definitions and instances", () => {
    it("uses stable namespaced types without duplicating module ids", () => {
        const instance = createModuleInstance("inverter", placement);
        expect(instance.type).toBe("module:inverter");
        expect(getModuleId(instance.type)).toBe("inverter");
        expect(getModuleId("wire")).toBeUndefined();
        expect(getModuleId("module:")).toBeUndefined();
        expect(() => getModuleComponentType(" ")).toThrow(
            "Module id cannot be empty",
        );
    });

    it("copies the instance position", () => {
        const position = { x: 1, y: 2 };
        const instance = createModuleInstance("inverter", {
            ...placement,
            position,
        });
        position.x = 8;
        expect(instance.position).toEqual({ x: 1, y: 2 });
    });

    it("rejects empty instance ids", () => {
        expect(() =>
            createModuleInstance("inverter", {
                ...placement,
                id: " ",
            }),
        ).toThrow("Module instance id cannot be empty");
    });

    it("rejects invalid instance placements", () => {
        expect(() =>
            createModuleInstance("inverter", {
                ...placement,
                position: { x: 0.5, y: 0 },
            }),
        ).toThrow("Invalid module instance placement");
    });
});

describe("ModuleCatalog", () => {
    it("resolves built-ins and declarative module descriptors", () => {
        const definition = createTestModule();
        const catalog = new ModuleCatalog([definition]);
        const descriptor = catalog.get("module:inverter");
        expect(catalog.has("wire")).toBe(true);
        expect(catalog.get("wire")).toBe(defaultComponentRegistry.get("wire"));
        expect(catalog.has("module:inverter")).toBe(true);
        expect(descriptor.footprint).toEqual({ width: 3, height: 3 });
        expect(descriptor.ports).toEqual(definition.ports);
        expect(descriptor).not.toHaveProperty("computeOutputs");
        expect(catalog.getModule("inverter")).toEqual(definition);
    });

    it("reports unknown definitions and module references", () => {
        const catalog = new ModuleCatalog([]);
        expect(catalog.has("module:missing")).toBe(false);
        expect(() => catalog.get("module:missing")).toThrow("Unknown module");
        expect(() => catalog.getModule("missing")).toThrow("Unknown module");
        expect(() =>
            CircuitLayout.from(
                {
                    width: 8,
                    height: 8,
                    components: [createModuleInstance("missing", placement)],
                },
                catalog,
            ),
        ).toThrow("Unknown module");
    });

    it("rejects duplicate definition ids", () => {
        expect(
            () => new ModuleCatalog([createTestModule(), createTestModule()]),
        ).toThrow("Duplicate module id");
    });

    it.each(["", " "])("rejects blank ids and names: %j", (value) => {
        expect(
            () => new ModuleCatalog([createTestModule({ id: value })]),
        ).toThrow("Module id cannot be empty");
        expect(
            () => new ModuleCatalog([createTestModule({ name: value })]),
        ).toThrow("Module name cannot be empty");
    });

    it("rejects invalid footprints", () => {
        expect(
            () =>
                new ModuleCatalog([
                    createTestModule({ footprint: { width: 0, height: 3 } }),
                ]),
        ).toThrow("Component footprint must use positive integer dimensions");
    });

    it("rejects duplicate public port ids", () => {
        const definition = createTestModule();
        expect(
            () =>
                new ModuleCatalog([
                    {
                        ...definition,
                        ports: definition.ports.map((port) => ({
                            ...port,
                            id: "same",
                        })),
                    },
                ]),
        ).toThrow("Duplicated port id");
    });

    it("rejects coincident public ports and offsets beyond the edge", () => {
        const definition = createTestModule();
        expect(
            () =>
                new ModuleCatalog([
                    {
                        ...definition,
                        ports: definition.ports.map((port) => ({
                            ...port,
                            side: "west",
                        })),
                    },
                ]),
        ).toThrow("Duplicated port side");
        expect(
            () =>
                new ModuleCatalog([
                    {
                        ...definition,
                        ports: [{ ...definition.ports[0], offset: 3 }],
                    },
                ]),
        ).toThrow("Invalid port offset");
    });

    it.each([
        {
            footprint: { width: 3, height: 3 },
            sides: ["west", "north"],
            offsets: [0, 0],
        },
        {
            footprint: { width: 3, height: 3 },
            sides: ["north", "east"],
            offsets: [2, 0],
        },
        {
            footprint: { width: 3, height: 3 },
            sides: ["east", "south"],
            offsets: [2, 2],
        },
        {
            footprint: { width: 3, height: 3 },
            sides: ["south", "west"],
            offsets: [0, 2],
        },
        {
            footprint: { width: 1, height: 1 },
            sides: ["west", "east"],
            offsets: [0, 0],
        },
        {
            footprint: { width: 3, height: 1 },
            sides: ["north", "south"],
            offsets: [1, 1],
        },
        {
            footprint: { width: 1, height: 3 },
            sides: ["west", "east"],
            offsets: [1, 1],
        },
    ] as const)(
        "rejects ports on different sides sharing a cell: %j",
        ({ footprint, sides, offsets }) => {
            const definition = createTestModule();
            expect(
                () =>
                    new ModuleCatalog([
                        {
                            ...definition,
                            footprint,
                            ports: definition.ports.map((port, index) => ({
                                ...port,
                                side: sides[index],
                                offset: offsets[index],
                            })),
                        },
                    ]),
            ).toThrow("Module ports occupy the same cell");
        },
    );

    it("allows a one-cell module with a single public port", () => {
        const definition = createTestModule();
        const catalog = new ModuleCatalog([
            {
                ...definition,
                footprint: { width: 1, height: 1 },
                ports: [{ ...definition.ports[0], offset: 0 }],
            },
        ]);
        expect(catalog.get("module:inverter").ports).toHaveLength(1);
    });

    it("allows ports on adjacent sides when they occupy different cells", () => {
        const definition = createTestModule();
        const catalog = new ModuleCatalog([
            {
                ...definition,
                ports: [
                    { ...definition.ports[0], side: "north", offset: 0 },
                    { ...definition.ports[1], side: "east", offset: 0 },
                ],
            },
        ]);
        expect(catalog.get("module:inverter").ports).toHaveLength(2);
    });

    it("rejects blank port names", () => {
        const definition = createTestModule();
        expect(
            () =>
                new ModuleCatalog([
                    {
                        ...definition,
                        ports: [{ ...definition.ports[0], name: " " }],
                    },
                ]),
        ).toThrow("Module port name cannot be empty");
    });

    it("rejects missing internal components and ports", () => {
        const definition = createTestModule();
        for (const [internalPort, message] of [
            [
                { componentId: "missing", portId: "input" },
                "Unknown internal component",
            ],
            [
                { componentId: "not-1", portId: "missing" },
                "Unknown internal port",
            ],
        ] as const) {
            expect(
                () =>
                    new ModuleCatalog([
                        {
                            ...definition,
                            ports: [{ ...definition.ports[0], internalPort }],
                        },
                    ]),
            ).toThrow(message);
        }
    });

    it("rejects ports exposed on the opposite placement layer", () => {
        const definition = createTestModule();
        const invalid = {
            ...definition,
            ports: [{ ...definition.ports[0], layerOffset: 1 }],
        } as unknown as ModuleDefinition;
        expect(() => new ModuleCatalog([invalid])).toThrow(
            "Module ports must use the placement layer",
        );
    });

    it("rejects nested modules, including self references", () => {
        const definition = createTestModule();
        expect(
            () =>
                new ModuleCatalog([
                    {
                        ...definition,
                        circuit: {
                            width: 8,
                            height: 8,
                            components: [
                                createModuleInstance("inverter", placement),
                            ],
                        },
                    },
                ]),
        ).toThrow("Nested modules are not supported");
    });

    it("validates internal collisions and references", () => {
        const definition = createTestModule();
        const internal = definition.circuit.components[0];
        expect(
            () =>
                new ModuleCatalog([
                    {
                        ...definition,
                        circuit: {
                            ...definition.circuit,
                            components: [
                                internal,
                                { ...internal, id: "duplicate-position" },
                            ],
                        },
                    },
                ]),
        ).toThrow("Multiple components occupy position");
        expect(
            () =>
                new ModuleCatalog([
                    {
                        ...definition,
                        circuit: {
                            ...definition.circuit,
                            components: [{ ...internal, type: "missing" }],
                        },
                    },
                ]),
        ).toThrow("Unknown component type");
    });

    it("keeps two-layer internals independent from the package layer", () => {
        const definition = createTestModule();
        const catalog = new ModuleCatalog([
            {
                ...definition,
                circuit: {
                    ...definition.circuit,
                    components: definition.circuit.components.map(
                        (component) => ({ ...component, layer: 1 }),
                    ),
                },
            },
        ]);
        const instance = createModuleInstance("inverter", placement);
        const descriptor = catalog.get(instance.type);
        expect(
            getOccupiedCells(instance, descriptor).every(
                (cell) => cell.layer === 0,
            ),
        ).toBe(true);
        expect(
            resolvePortGeometry(instance, descriptor, descriptor.ports[0])
                .layer,
        ).toBe(0);
    });

    it("snapshots data without retaining the source arrays and positions", () => {
        const position = { x: 1, y: 1 };
        const reference = { componentId: "not-1", portId: "input" };
        const definition = createTestModule();
        const definitions = [
            {
                ...definition,
                ports: [{ ...definition.ports[0], internalPort: reference }],
                circuit: {
                    ...definition.circuit,
                    components: [
                        { ...definition.circuit.components[0], position },
                    ],
                },
            },
        ];
        const catalog = new ModuleCatalog(definitions);
        position.x = 100;
        reference.portId = "missing";
        definitions.length = 0;
        expect(catalog.modules).toHaveLength(1);
        expect(
            catalog.getModule("inverter").circuit.components[0].position.x,
        ).toBe(1);
        expect(catalog.getModule("inverter").ports[0].internalPort.portId).toBe(
            "input",
        );
    });

    it("supports multiple instances, movement and clipboard references", () => {
        const catalog = new ModuleCatalog([createTestModule()]);
        const first = createModuleInstance("inverter", placement);
        const second = createModuleInstance("inverter", {
            ...placement,
            id: "instance-2",
            position: { x: 5, y: 1 },
        });
        const circuit = CircuitLayout.from(
            {
                width: 12,
                height: 12,
                components: [first, second],
            },
            catalog,
        );
        expect(circuit.getComponentAt({ x: 3, y: 3 })).toBe(first);
        expect(circuit.getComponentAt({ x: 7, y: 3 })).toBe(second);
        const moved = moveComponents(circuit, new Set([first.id]), {
            x: 0,
            y: 4,
        });
        expect(moved?.getComponentAt({ x: 3, y: 7 })?.type).toBe(first.type);
        const clipboard = createComponentClipboard(
            circuit,
            new Set([first.id]),
        );
        if (!clipboard) throw new Error("Expected clipboard");
        const pasted = pasteComponentClipboard(
            circuit,
            clipboard,
            { x: 1, y: 8 },
            () => "copy",
        );
        expect(pasted?.circuit.getComponentAt({ x: 3, y: 10 })?.type).toBe(
            first.type,
        );
        expect(pasted?.circuit.registry).toBe(catalog);
    });
});
