import { describe, expect, it } from "vitest";

import type { ComponentDefinition } from "./componentDefinition";
import { ComponentRegistry } from "./componentRegistry";
import { compileNetlist } from "./netlist/compileNetlist";
import { portKey } from "./netlist/netlist";
import type { PlacedComponent, Rotation } from "./placedComponent";

const rectangle: ComponentDefinition = {
    type: "rectangle",
    footprint: { width: 3, height: 2 },
    ports: [
        { id: "a", kind: "input", side: "west" },
        { id: "b", kind: "input", side: "west", offset: 1 },
    ],
    createInitialState: () => null,
    computeOutputs: () => new Map(),
};

const probe: ComponentDefinition = {
    type: "probe",
    ports: [{ id: "output", kind: "output", side: "south" }],
    createInitialState: () => null,
    computeOutputs: () => new Map(),
};

function component(
    id: string,
    type: string,
    x: number,
    y: number,
    rotation: Rotation = 0,
): PlacedComponent {
    return { id, type, position: { x, y }, rotation, layer: 0 };
}

describe("component geometry validation", () => {
    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid footprint dimensions: %s",
        (size) => {
            for (const footprint of [
                { width: size, height: 2 },
                { width: 2, height: size },
            ]) {
                expect(
                    () => new ComponentRegistry([{ ...rectangle, footprint }]),
                ).toThrow(
                    "Component footprint must use positive integer dimensions",
                );
            }
        },
    );

    it("allows multiple ports on one edge at different offsets", () => {
        expect(() => new ComponentRegistry([rectangle])).not.toThrow();
    });

    it.each([
        ["west", 2],
        ["east", -1],
        ["north", 3],
        ["south", 0.5],
        ["west", Number.NaN],
        ["west", Number.POSITIVE_INFINITY],
    ] as const)("rejects offset %s:%s", (side, offset) => {
        expect(
            () =>
                new ComponentRegistry([
                    {
                        ...rectangle,
                        ports: [{ id: "a", kind: "input", side, offset }],
                    },
                ]),
        ).toThrow("Invalid port offset");
    });

    it("rejects coincident ports with implicit and explicit offset zero", () => {
        expect(
            () =>
                new ComponentRegistry([
                    {
                        ...rectangle,
                        ports: [
                            { id: "a", kind: "input", side: "west" },
                            { id: "b", kind: "input", side: "west", offset: 0 },
                        ],
                    },
                ]),
        ).toThrow('Duplicated port side "west"');
    });
});

describe("compileNetlist with rectangular components", () => {
    const registry = new ComponentRegistry([rectangle, probe]);

    it("connects rotated offset ports to separate adjacent components", () => {
        const netlist = compileNetlist(
            {
                width: 4,
                height: 4,
                components: [
                    component("rectangle-1", "rectangle", 1, 1, 90),
                    component("probe-a", "probe", 2, 0),
                    component("probe-b", "probe", 1, 0),
                ],
            },
            registry,
        );
        const netId = (componentId: string, portId: string) =>
            netlist.netByPort.get(portKey({ componentId, portId }));
        const inputA = netId("rectangle-1", "a");
        const inputB = netId("rectangle-1", "b");

        expect(inputA).toBeDefined();
        expect(inputB).toBeDefined();
        expect(inputA).toBe(netId("probe-a", "output"));
        expect(inputB).toBe(netId("probe-b", "output"));
        expect(inputA).not.toBe(inputB);
    });

    it("rejects overlap away from the component origin", () => {
        expect(() =>
            compileNetlist(
                {
                    width: 4,
                    height: 4,
                    components: [
                        component("rectangle-1", "rectangle", 1, 1, 90),
                        component("probe-1", "probe", 2, 3),
                    ],
                },
                registry,
            ),
        ).toThrow("Multiple components occupy position");
    });

    it("rejects a rotated footprint extending outside the circuit", () => {
        expect(() =>
            compileNetlist(
                {
                    width: 4,
                    height: 3,
                    components: [
                        component("rectangle-1", "rectangle", 1, 1, 90),
                    ],
                },
                registry,
            ),
        ).toThrow("Component is outside the circuit");
    });

    it("allows a component underneath on the opposite layer", () => {
        expect(() =>
            compileNetlist(
                {
                    width: 4,
                    height: 4,
                    components: [
                        component("rectangle-1", "rectangle", 1, 1, 90),
                        { ...component("probe-1", "probe", 2, 3), layer: 1 },
                    ],
                },
                registry,
            ),
        ).not.toThrow();
    });
});
