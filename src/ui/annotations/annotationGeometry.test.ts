import { describe, expect, it } from "vitest";
import {
    constrainEnd,
    isLineTooSmall,
    isRectangleTooSmall,
    normalizeRectangle,
    screenToCanvasPoint,
} from "./annotationGeometry";

describe("annotationGeometry", () => {
    it.each([
        {
            direction: "top-left -> bottom right",
            start: { x: 10, y: 20 },
            end: { x: 30, y: 50 },
        },
        {
            direction: "bottom-right -> top left",
            start: { x: 30, y: 50 },
            end: { x: 10, y: 20 },
        },
        {
            direction: "top-right -> bottom-left",
            start: { x: 30, y: 20 },
            end: { x: 10, y: 50 },
        },
        {
            direction: "bottom-left -> top-right",
            start: { x: 10, y: 50 },
            end: { x: 30, y: 20 },
        },
    ])(
        "normalizes a rectangle regardless of the drawing direction ($direction)",
        ({ start, end }) => {
            const normalized = normalizeRectangle(start, end);

            expect(normalized).toEqual({
                position: {
                    x: 10,
                    y: 20,
                },
                width: 20,
                height: 30,
            });
        },
    );

    it("converts screen coordinates to canvas coordinates", () => {
        const result = screenToCanvasPoint({
            width: 1000,
            height: 800,
            clientX: 350,
            clientY: 250,
            bounds: {
                left: 100,
                top: 50,
                width: 500,
                height: 400,
            },
        });

        expect(result).toEqual({ x: 500, y: 400 });
    });

    it("converts coordinates correctly when the canvas is zoomed", () => {
        const result = screenToCanvasPoint({
            width: 500,
            height: 400,
            clientX: 600,
            clientY: 450,
            bounds: {
                left: 100,
                top: 50,
                width: 1000,
                height: 800,
            },
        });

        expect(result).toEqual({
            x: 250,
            y: 200,
        });
    });

    it("clamps coordinates outside the canvas", () => {
        const bounds = {
            left: 100,
            top: 50,
            width: 500,
            height: 400,
        };

        const beforeCanvas = screenToCanvasPoint({
            width: 1000,
            height: 800,
            clientX: 50,
            clientY: 0,
            bounds,
        });

        const afterCanvas = screenToCanvasPoint({
            width: 1000,
            height: 800,
            clientX: 700,
            clientY: 550,
            bounds,
        });

        expect(beforeCanvas).toEqual({ x: 0, y: 0 });
        expect(afterCanvas).toEqual({ x: 1000, y: 800 });
    });

    it("maps the visible canvas edges to the logical canvas edges", () => {
        const bounds = {
            left: 100,
            top: 50,
            width: 500,
            height: 400,
        };

        const topLeft = screenToCanvasPoint({
            width: 1000,
            height: 800,
            clientX: bounds.left,
            clientY: bounds.top,
            bounds,
        });

        const bottomRight = screenToCanvasPoint({
            width: 1000,
            height: 800,
            clientX: bounds.left + bounds.width,
            clientY: bounds.top + bounds.height,
            bounds,
        });

        expect(topLeft).toEqual({ x: 0, y: 0 });
        expect(bottomRight).toEqual({ x: 1000, y: 800 });
    });

    it("returns the original endpoint when constraint is disabled", () => {
        const start = {
            x: 0,
            y: 0,
        };
        const end = {
            x: 10,
            y: 10,
        };

        const result = constrainEnd(start, end, "rectangle", false);

        expect(result).toEqual(end);
    });

    it("constrains a rectangle to a square", () => {
        const result = constrainEnd(
            { x: 10, y: 10 },
            { x: 30, y: 20 },
            "rectangle",
            true,
        );

        expect(result).toEqual({
            x: 30,
            y: 30,
        });
    });

    it("constrains a square drawn in a negative direction", () => {
        const result = constrainEnd(
            { x: 30, y: 30 },
            { x: 10, y: 20 },
            "rectangle",
            true,
        );

        expect(result).toEqual({
            x: 10,
            y: 10,
        });
    });

    it("snaps a line to the nearest 45-degree angle", () => {
        const start = {
            x: 0,
            y: 0,
        };
        const end = {
            x: 10,
            y: 3,
        };

        const result = constrainEnd(start, end, "line", true);

        expect(result.x).toBeCloseTo(Math.hypot(10, 3));
        expect(result.y).toBeCloseTo(0);

        expect(Math.hypot(result.x - start.x, result.y - start.y)).toBeCloseTo(
            Math.hypot(end.x - start.x, end.y - start.y),
        );
    });

    it("snaps a line to the nearest diagonal", () => {
        const start = {
            x: 0,
            y: 0,
        };
        const end = {
            x: 10,
            y: 8,
        };

        const result = constrainEnd(start, end, "line", true);
        const expectedCoordinate = Math.hypot(10, 8) / Math.SQRT2;

        expect(result.x).toBeCloseTo(expectedCoordinate);
        expect(result.y).toBeCloseTo(expectedCoordinate);
    });

    it("uses euclidean distance to validate a line", () => {
        expect(isLineTooSmall({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false);
    });

    it("rejects a line shorter than four pixels", () => {
        expect(isLineTooSmall({ x: 0, y: 0 }, { x: 0, y: 3 })).toBe(true);
    });

    it("accepts a line exactly four pixels long", () => {
        expect(isLineTooSmall({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(false);
    });

    it("rejects a rectangle whose width is below four pixels", () => {
        const input = {
            position: {
                x: 0,
                y: 0,
            },
            width: 3,
            height: 10,
        };
        expect(isRectangleTooSmall(input)).toBe(true);
    });

    it("rejects a rectangle whose height is below four pixels", () => {
        const input = {
            position: {
                x: 0,
                y: 0,
            },
            width: 10,
            height: 3,
        };
        expect(isRectangleTooSmall(input)).toBe(true);
    });

    it("accepts a rectangle whose dimensions are exactly four pixels", () => {
        const input = {
            position: {
                x: 0,
                y: 0,
            },
            width: 4,
            height: 4,
        };
        expect(isRectangleTooSmall(input)).toBe(false);
    });

    it("rejects a rectangle with a zero dimension", () => {
        const input = {
            position: {
                x: 0,
                y: 0,
            },
            width: 0,
            height: 10,
        };
        expect(isRectangleTooSmall(input)).toBe(true);
    });
});
