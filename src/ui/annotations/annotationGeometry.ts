import type { CanvasPoint } from "../../domain/project/circuitAnnotation";
import type { ShapeType } from "../../domain/project/circuitAnnotation";

type NormalizedRectangle = {
    position: {
        x: number;
        y: number;
    };
    width: number;
    height: number;
};

type Bounds = {
    left: number;
    top: number;
    height: number;
    width: number;
};

type ScreenToCanvasPointOptions = {
    width: number;
    height: number;
    clientX: number;
    clientY: number;
    bounds: Bounds;
};

export function normalizeRectangle(
    start: CanvasPoint,
    end: CanvasPoint,
): NormalizedRectangle {
    return {
        position: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
        },
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
    };
}

export function constrainEnd(
    start: CanvasPoint,
    end: CanvasPoint,
    kind: ShapeType,
    constrained: boolean,
): CanvasPoint {
    if (!constrained) {
        return end;
    }

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    if (kind === "rectangle") {
        const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));

        return {
            x: start.x + Math.sign(deltaX || 1) * size,
            y: start.y + Math.sign(deltaY || 1) * size,
        };
    }

    const length = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX);
    const step = Math.PI / 4;
    const constrainedAngle = Math.round(angle / step) * step;

    return {
        x: start.x + Math.cos(constrainedAngle) * length,
        y: start.y + Math.sin(constrainedAngle) * length,
    };
}

export function screenToCanvasPoint({
    width,
    height,
    clientX,
    clientY,
    bounds,
}: ScreenToCanvasPointOptions) {
    return {
        x: clamp(((clientX - bounds.left) / bounds.width) * width, 0, width),
        y: clamp(((clientY - bounds.top) / bounds.height) * height, 0, height),
    };
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

export function isLineTooSmall(start: CanvasPoint, end: CanvasPoint): boolean {
    return Math.hypot(end.x - start.x, end.y - start.y) < 4;
}

export function isRectangleTooSmall(rectangle: NormalizedRectangle): boolean {
    return rectangle.width < 4 || rectangle.height < 4;
}
