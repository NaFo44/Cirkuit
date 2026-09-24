import { describe, expect, it } from "vitest";

import type {
    PlacedComponent,
    Rotation,
} from "../../domain/circuit/placedComponent";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import {
    createSelectionRectangle,
    getComponentsInsideRectangle,
} from "./componentSelection";

function component(
    id: string,
    x: number,
    y: number,
    rotation: Rotation = 0,
): PlacedComponent {
    return {
        id,
        type: "wire",
        position: { x, y },
        rotation,
    };
}

const COMPONENTS = [
    component("first", 0, 0),
    component("second", 1, 0),
    component("third", 2, 1),
];

describe("componentSelection", () => {
    it.each([
        {
            start: { x: 10, y: 20 },
            end: { x: 50, y: 60 },
        },
        {
            start: { x: 50, y: 60 },
            end: { x: 10, y: 20 },
        },
        {
            start: { x: 50, y: 20 },
            end: { x: 10, y: 60 },
        },
        {
            start: { x: 10, y: 60 },
            end: { x: 50, y: 20 },
        },
    ])(
        "normalizes a selection rectangle regardless of drag direction",
        ({ start, end }) => {
            expect(createSelectionRectangle(start, end)).toEqual({
                left: 10,
                top: 20,
                right: 50,
                bottom: 60,
            });
        },
    );

    it("selects every component intersecting the rectangle", () => {
        const selection = getComponentsInsideRectangle(COMPONENTS, {
            left: CELL_SIZE - 1,
            top: 0,
            right: CELL_SIZE + 1,
            bottom: CELL_SIZE,
        });

        expect(selection).toEqual(new Set(["first", "second"]));
    });

    it("does not select the neighboring cell when the rectangle ends on its border", () => {
        const selection = getComponentsInsideRectangle(
            COMPONENTS,
            createSelectionRectangle(
                { x: 0, y: 0 },
                { x: CELL_SIZE, y: CELL_SIZE },
            ),
        );

        expect(selection).toEqual(new Set(["first"]));
    });

    it("selects a component when clicking inside its cell", () => {
        const point = {
            x: CELL_SIZE + 1,
            y: 1,
        };

        const selection = getComponentsInsideRectangle(
            COMPONENTS,
            createSelectionRectangle(point, point),
        );

        expect(selection).toEqual(new Set(["second"]));
    });

    it("returns an empty selection when the rectangle hits no component", () => {
        const selection = getComponentsInsideRectangle(COMPONENTS, {
            left: CELL_SIZE * 4,
            top: CELL_SIZE * 4,
            right: CELL_SIZE * 5,
            bottom: CELL_SIZE * 5,
        });

        expect(selection).toEqual(new Set());
    });

    it("selects components across multiple rows", () => {
        const selection = getComponentsInsideRectangle(COMPONENTS, {
            left: CELL_SIZE,
            top: 0,
            right: CELL_SIZE * 3,
            bottom: CELL_SIZE * 2,
        });

        expect(selection).toEqual(new Set(["second", "third"]));
    });
});
