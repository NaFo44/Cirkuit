import { describe, expect, it } from "vitest";

import { defaultComponentRegistry } from "./components/defaultComponentRegistry";
import { compileNetlist } from "./netlist/compileNetlist";
import { portKey } from "./netlist/netlist";
import { CircuitLayout } from "./circuitLayout";
import type { PlacedComponent, Rotation } from "./placedComponent";

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

describe("CircuitLayout", () => {
    it("creates an empty layout", () => {
        const layout = CircuitLayout.empty(4, 3);

        expect(layout.width).toBe(4);
        expect(layout.height).toBe(3);
        expect(layout.components).toEqual([]);
        expect(layout.getComponentAt({ x: 0, y: 0 })).toBeUndefined();
    });

    it.each([
        { width: 0, height: 1 },
        { width: 1, height: 0 },
        { width: -1, height: 1 },
        { width: 1.5, height: 1 },
        { width: 1, height: Number.NaN },
    ])("rejects invalid dimensions $width x $height", ({ width, height }) => {
        expect(() => CircuitLayout.empty(width, height)).toThrow(
            "Layout dimensions must be positive integers",
        );
    });

    it("stores and returns a component by position", () => {
        const source = component("source-1", "source", 1, 2);

        const layout = CircuitLayout.empty(4, 3).withComponent(source);

        expect(layout.getComponentAt({ x: 1, y: 2 })).toBe(source);
        expect(layout.components).toEqual([source]);
    });

    it("does not mutate the previous layout when adding a component", () => {
        const original = CircuitLayout.empty(2, 1);
        const source = component("source-1", "source", 0, 0);

        const updated = original.withComponent(source);

        expect(updated).not.toBe(original);
        expect(original.components).toEqual([]);
        expect(
            original.getComponentAt({
                x: 0,
                y: 0,
            }),
        ).toBeUndefined();

        expect(updated.components).toEqual([source]);
    });

    it("replaces the component occupying a position", () => {
        const source = component("source-1", "source", 0, 0);
        const light = component("light-1", "light", 0, 0);

        const original = CircuitLayout.empty(1, 1).withComponent(source);

        const updated = original.withComponent(light);

        expect(updated.components).toEqual([light]);
        expect(
            updated.getComponentAt({
                x: 0,
                y: 0,
            }),
        ).toBe(light);

        expect(
            original.getComponentAt({
                x: 0,
                y: 0,
            }),
        ).toBe(source);
    });

    it("returns the same layout for a structurally identical component", () => {
        const source = component("source-1", "source", 0, 0);

        const layout = CircuitLayout.empty(1, 1).withComponent(source);

        const identicalSource = component("source-1", "source", 0, 0);

        expect(layout.withComponent(identicalSource)).toBe(layout);
    });

    it("updates a component while preserving its id", () => {
        const source = component("source-1", "source", 0, 0);

        const original = CircuitLayout.empty(1, 1).withComponent(source);

        const updated = original.withComponent({
            ...source,
            rotation: 90,
        });

        expect(updated).not.toBe(original);
        expect(updated.components).toEqual([
            {
                ...source,
                rotation: 90,
            },
        ]);
    });

    it("rejects an empty component id", () => {
        const layout = CircuitLayout.empty(1, 1);

        expect(() =>
            layout.withComponent(component("", "source", 0, 0)),
        ).toThrow("Component id cannot be empty");
    });

    it.each([
        { x: 0.5, y: 0 },
        { x: 0, y: 0.5 },
        { x: Number.NaN, y: 0 },
        { x: Number.POSITIVE_INFINITY, y: 0 },
    ])("rejects the non-integer position $x,$y", ({ x, y }) => {
        const layout = CircuitLayout.empty(2, 2);

        expect(() =>
            layout.withComponent(component("source-1", "source", x, y)),
        ).toThrow("Component position must use integers: source-1");
    });

    it.each([
        { x: -1, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 2 },
    ])("rejects the out-of-bounds position $x,$y", ({ x, y }) => {
        const layout = CircuitLayout.empty(3, 2);

        expect(() =>
            layout.withComponent(component("source-1", "source", x, y)),
        ).toThrow("Component is outside the layout: source-1");
    });

    it("rejects an id already used at another position", () => {
        const layout = CircuitLayout.empty(2, 1).withComponent(
            component("component-1", "source", 0, 0),
        );

        expect(() =>
            layout.withComponent(component("component-1", "source", 1, 0)),
        ).toThrow(
            "Component id is already used at another position: component-1",
        );
    });

    it("removes a component without mutating the previous layout", () => {
        const source = component("source-1", "source", 0, 0);

        const original = CircuitLayout.empty(1, 1).withComponent(source);

        const updated = original.withoutComponentAt({
            x: 0,
            y: 0,
        });

        expect(updated).not.toBe(original);
        expect(updated.components).toEqual([]);
        expect(
            updated.getComponentAt({
                x: 0,
                y: 0,
            }),
        ).toBeUndefined();

        expect(original.components).toEqual([source]);
    });

    it("returns the same layout when removing an empty position", () => {
        const layout = CircuitLayout.empty(2, 2);

        expect(
            layout.withoutComponentAt({
                x: 1,
                y: 1,
            }),
        ).toBe(layout);
    });

    it("can be compiled directly as a circuit", () => {
        const layout = CircuitLayout.empty(2, 1)
            .withComponent(component("source-1", "source", 0, 0))
            .withComponent(component("light-1", "light", 1, 0));

        const netlist = compileNetlist(layout, defaultComponentRegistry);

        const sourceNet = netlist.netByPort.get(
            portKey({
                componentId: "source-1",
                portId: "output",
            }),
        );

        const lightNet = netlist.netByPort.get(
            portKey({
                componentId: "light-1",
                portId: "input",
            }),
        );

        expect(sourceNet).toBeDefined();
        expect(sourceNet).toBe(lightNet);
        expect(netlist.nets).toHaveLength(1);
    });
});
