import { describe, expect, it } from "vitest";

import type { Circuit } from "../circuit";
import { defaultComponentRegistry } from "../components/defaultComponentRegistry";
import { compileNetlist } from "./compileNetlist";
import { portKey } from "./netlist";
import type { PlacedComponent, Rotation } from "../placedComponent";

function getNetId(
    netlist: ReturnType<typeof compileNetlist>,
    componentId: string,
    portId: string,
): string | undefined {
    return netlist.netByPort.get(portKey({ componentId, portId }));
}

function component(
    id: string,
    type: string,
    x: number,
    y: number,
    rotation: Rotation = 0,
): PlacedComponent {
    return {
        id,
        type,
        position: { x, y },
        rotation,
    };
}

describe("compileNetlist", () => {
    it("rejects an invalid circuit height", () => {
        expect(() =>
            compileNetlist(
                {
                    width: 1,
                    height: 0,
                    components: [],
                },
                defaultComponentRegistry,
            ),
        ).toThrow("Circuit height must be a positive integer");
    });

    it("connects an adjacent source and light", () => {
        const circuit: Circuit = {
            width: 3,
            height: 1,
            components: [
                {
                    id: "source-1",
                    type: "source",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                },
                {
                    id: "light-1",
                    type: "light",
                    position: { x: 1, y: 0 },
                    rotation: 0,
                },
            ],
        };

        const netlist = compileNetlist(circuit, defaultComponentRegistry);

        expect(getNetId(netlist, "source-1", "output")).toBe(
            getNetId(netlist, "light-1", "input"),
        );

        expect(netlist.nets).toHaveLength(1);
        expect(netlist.nets[0].drivers).toEqual([
            {
                componentId: "source-1",
                portId: "output",
            },
        ]);
    });

    it("connects a source to a light through a wire", () => {
        const circuit: Circuit = {
            width: 3,
            height: 1,
            components: [
                {
                    id: "source-1",
                    type: "source",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                },
                {
                    id: "wire-1",
                    type: "wire",
                    position: { x: 1, y: 0 },
                    rotation: 0,
                },
                {
                    id: "light-1",
                    type: "light",
                    position: { x: 2, y: 0 },
                    rotation: 0,
                },
            ],
        };

        const netlist = compileNetlist(circuit, defaultComponentRegistry);

        const sourceNet = getNetId(netlist, "source-1", "output");

        expect(sourceNet).toBe(getNetId(netlist, "wire-1", "west"));
        expect(sourceNet).toBe(getNetId(netlist, "wire-1", "east"));
        expect(sourceNet).toBe(getNetId(netlist, "light-1", "input"));
    });

    it("creates no driver for a wire connected to a light", () => {
        const circuit: Circuit = {
            width: 2,
            height: 1,
            components: [
                {
                    id: "wire-1",
                    type: "wire",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                },
                {
                    id: "light-1",
                    type: "light",
                    position: { x: 1, y: 0 },
                    rotation: 0,
                },
            ],
        };

        const netlist = compileNetlist(circuit, defaultComponentRegistry);

        const netId = getNetId(netlist, "light-1", "input");
        const net = netlist.nets.find((candidate) => candidate.id === netId);

        expect(net?.drivers).toEqual([]);
        expect(net?.readers).toEqual([
            {
                componentId: "light-1",
                portId: "input",
            },
        ]);
    });

    it("rejects duplicate component ids", () => {
        const circuit: Circuit = {
            width: 2,
            height: 1,
            components: [
                component("duplicate", "source", 0, 0),
                component("duplicate", "light", 1, 0),
            ],
        };

        expect(() => compileNetlist(circuit, defaultComponentRegistry)).toThrow(
            "Duplicated component id: duplicate",
        );
    });

    it("rejects components occupying the same position", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("light-1", "light", 0, 0),
            ],
        };

        expect(() => compileNetlist(circuit, defaultComponentRegistry)).toThrow(
            "Multiple components occupy position",
        );
    });

    it("rejects non-integer component positions", () => {
        const circuit: Circuit = {
            width: 2,
            height: 1,
            components: [component("source-1", "source", 0.5, 0)],
        };

        expect(() => compileNetlist(circuit, defaultComponentRegistry)).toThrow(
            "Component position must use integers: source-1",
        );
    });

    it("rejects components outside the circuit", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [component("source-1", "source", 1, 0)],
        };

        expect(() => compileNetlist(circuit, defaultComponentRegistry)).toThrow(
            "Component is outside the circuit: source-1",
        );
    });

    it("rejects unknown component types", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [component("unknown-1", "unknown", 0, 0)],
        };

        expect(() => compileNetlist(circuit, defaultComponentRegistry)).toThrow(
            'Unknown component type "unknown" for component: unknown-1',
        );
    });

    it("connects rotated ports facing each other", () => {
        const circuit: Circuit = {
            width: 1,
            height: 2,
            components: [
                component("source-1", "source", 0, 0, 90),
                component("light-1", "light", 0, 1, 90),
            ],
        };

        const netlist = compileNetlist(circuit, defaultComponentRegistry);

        expect(getNetId(netlist, "source-1", "output")).toBe(
            getNetId(netlist, "light-1", "input"),
        );
    });

    it("does not connect adjacent ports that do not face each other", () => {
        const circuit: Circuit = {
            width: 2,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("light-1", "light", 1, 0, 180),
            ],
        };

        const netlist = compileNetlist(circuit, defaultComponentRegistry);

        expect(getNetId(netlist, "source-1", "output")).not.toBe(
            getNetId(netlist, "light-1", "input"),
        );

        expect(netlist.nets).toHaveLength(2);
    });

    it("handles conductive loops", () => {
        const circuit: Circuit = {
            width: 2,
            height: 2,
            components: [
                component("wire-1", "wire", 0, 0),
                component("wire-2", "wire", 1, 0),
                component("wire-3", "wire", 1, 1),
                component("wire-4", "wire", 0, 1),
            ],
        };

        const netlist = compileNetlist(circuit, defaultComponentRegistry);

        expect(netlist.nets).toHaveLength(1);
        expect(netlist.nets[0].ports).toHaveLength(16);
        expect(netlist.nets[0].drivers).toEqual([]);
        expect(netlist.nets[0].readers).toEqual([]);
    });

    it("produces the same netlist regardless of component order", () => {
        const circuit: Circuit = {
            width: 3,
            height: 1,
            components: [
                component("source-1", "source", 0, 0),
                component("wire-1", "wire", 1, 0),
                component("light-1", "light", 2, 0),
            ],
        };

        const reversedCircuit: Circuit = {
            ...circuit,
            components: [...circuit.components].reverse(),
        };

        expect(
            compileNetlist(reversedCircuit, defaultComponentRegistry),
        ).toEqual(compileNetlist(circuit, defaultComponentRegistry));
    });

    it("rejects and invalid circuit width", () => {
        expect(() =>
            compileNetlist(
                {
                    width: 0,
                    height: 1,
                    components: [],
                },
                defaultComponentRegistry,
            ),
        ).toThrow("Circuit width must be a positive integer");
    });

    it("rejects an empty component id", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [component("", "source", 0, 0)],
        };

        expect(() => compileNetlist(circuit, defaultComponentRegistry)).toThrow(
            "Component id cannot be empty",
        );
    });
});
