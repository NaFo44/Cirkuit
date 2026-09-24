import { describe, expect, it } from "vitest";

import { screenToCanvasPoint } from "./canvasCoordinates";

describe("screenToCanvasPoint", () => {
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
});
