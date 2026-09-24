import type { CanvasPoint } from "../../domain/grid/canvasPoint";

interface CanvasBounds {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}

interface ScreenToCanvasPointOptions {
    readonly width: number;
    readonly height: number;
    readonly clientX: number;
    readonly clientY: number;
    readonly bounds: CanvasBounds;
}

export function screenToCanvasPoint({
    width,
    height,
    clientX,
    clientY,
    bounds,
}: ScreenToCanvasPointOptions): CanvasPoint {
    return {
        x: clamp(((clientX - bounds.left) / bounds.width) * width, 0, width),
        y: clamp(((clientY - bounds.top) / bounds.height) * height, 0, height),
    };
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}
