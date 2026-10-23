import { describe, expect, it } from "vitest";

import type { ComponentDefinition } from "./componentDefinition";
import {
    getComponentFootprint,
    getLocalPortPosition,
    getOccupiedCells,
    resolvePortGeometry,
} from "./componentGeometry";
import { BUILT_IN_COMPONENT_DEFINITIONS } from "./components/builtInComponents";
import { rotateDirection } from "./direction";
import { ROTATIONS, type PlacedComponent } from "./placedComponent";

const rectangle: ComponentDefinition = {
    type: "rectangle",
    footprint: { width: 3, height: 2 },
    ports: [{ id: "input", kind: "input", side: "north", offset: 2 }],
    createInitialState: () => null,
    computeOutputs: () => new Map(),
};

const placement: PlacedComponent = {
    id: "rectangle-1",
    type: rectangle.type,
    position: { x: 10, y: 20 },
    rotation: 0,
    layer: 0,
};

describe("component geometry", () => {
    it.each([
        [0, 3, 2, 12, 20, "north"],
        [90, 2, 3, 11, 22, "east"],
        [180, 3, 2, 10, 21, "south"],
        [270, 2, 3, 10, 20, "west"],
    ] as const)(
        "resolved a non-square component rotate %i degrees",
        (rotation, width, height, x, y, side) => {
            expect(getComponentFootprint(rectangle, rotation)).toEqual({
                width,
                height,
            });
            expect(
                resolvePortGeometry(
                    { ...placement, rotation },
                    rectangle,
                    rectangle.ports[0],
                ),
            ).toEqual({ position: { x, y }, side, layer: 0 });
        },
    );

    it.each([
        ["north", 2, 2, 0],
        ["east", 1, 2, 1],
        ["south", 2, 2, 1],
        ["west", 1, 0, 1],
    ] as const)(
        "positions an offset port on the %s edge",
        (side, offset, x, y) => {
            expect(
                getLocalPortPosition(rectangle, {
                    id: "port",
                    kind: "input",
                    side,
                    offset,
                }),
            ).toEqual({ x, y });
        },
    );

    it("resolves port layers relative to the placement layer", () => {
        const port = { ...rectangle.ports[0], layerOffset: 1 as const };

        expect(resolvePortGeometry(placement, rectangle, port).layer).toBe(1);
        expect(
            resolvePortGeometry({ ...placement, layer: 1 }, rectangle, port)
                .layer,
        ).toBe(0);
    });

    it("enumerates the complete rotated footprint on its placement layer", () => {
        expect(
            getOccupiedCells(
                { ...placement, rotation: 90, layer: 1 },
                rectangle,
            ),
        ).toEqual([
            { position: { x: 10, y: 20 }, layer: 1 },
            { position: { x: 11, y: 20 }, layer: 1 },
            { position: { x: 10, y: 21 }, layer: 1 },
            { position: { x: 11, y: 21 }, layer: 1 },
            { position: { x: 10, y: 22 }, layer: 1 },
            { position: { x: 11, y: 22 }, layer: 1 },
        ]);
    });

    it("preserves the existing geometry of every built-in component", () => {
        for (const definition of BUILT_IN_COMPONENT_DEFINITIONS) {
            for (const rotation of ROTATIONS) {
                const component: PlacedComponent = {
                    ...placement,
                    type: definition.type,
                    rotation,
                };

                expect(getComponentFootprint(definition, rotation)).toEqual({
                    width: 1,
                    height: 1,
                });
                expect(getOccupiedCells(component, definition)).toEqual(
                    definition.type === "via"
                        ? [
                              { position: component.position, layer: 0 },
                              { position: component.position, layer: 1 },
                          ]
                        : [{ position: component.position, layer: 0 }],
                );

                for (const port of (definition as ComponentDefinition).ports) {
                    expect(
                        resolvePortGeometry(component, definition, port),
                    ).toEqual({
                        position: component.position,
                        side: rotateDirection(port.side, rotation),
                        layer: port.layerOffset ?? 0,
                    });
                }
            }
        }
    });
});
