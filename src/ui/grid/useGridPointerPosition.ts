import {
    useCallback,
    useRef,
    type PointerEvent as ReactPointerEvent,
    type RefObject,
} from "react";

import type { Position } from "../../domain/grid/position";
import { screenToCanvasPoint } from "./canvasCoordinates";

interface UseGridPointerPositionOptions {
    readonly width: number;
    readonly height: number;
    readonly cellSize: number;
}

interface GridPointerPosition {
    readonly gridRef: RefObject<HTMLDivElement | null>;

    readonly trackPointer: (event: ReactPointerEvent<HTMLDivElement>) => void;

    readonly clearPointer: () => void;

    readonly getPointerPosition: () => Position | null;
}

export function useGridPointerPosition({
    width,
    height,
    cellSize,
}: UseGridPointerPositionOptions): GridPointerPosition {
    const canvasWidth = width * cellSize;
    const canvasHeight = height * cellSize;

    const gridRef = useRef<HTMLDivElement>(null);

    const pointerRef = useRef<{
        readonly clientX: number;
        readonly clientY: number;
    } | null>(null);

    const trackPointer = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            pointerRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
            };
        },
        [],
    );

    const clearPointer = useCallback(() => {
        pointerRef.current = null;
    }, []);

    const getPointerPosition = useCallback((): Position | null => {
        const grid = gridRef.current;
        const pointer = pointerRef.current;

        if (!grid || !pointer) {
            return null;
        }

        const bounds = grid.getBoundingClientRect();

        if (
            pointer.clientX < bounds.left ||
            pointer.clientX >= bounds.right ||
            pointer.clientY < bounds.top ||
            pointer.clientY >= bounds.bottom
        ) {
            return null;
        }

        const canvasPoint = screenToCanvasPoint({
            width: canvasWidth,
            height: canvasHeight,
            clientX: pointer.clientX,
            clientY: pointer.clientY,
            bounds,
        });

        const position = {
            x: Math.floor(canvasPoint.x / cellSize),
            y: Math.floor(canvasPoint.y / cellSize),
        };

        return position.x >= 0 &&
            position.x < width &&
            position.y >= 0 &&
            position.y < height
            ? position
            : null;
    }, [canvasHeight, canvasWidth, cellSize, height, width]);

    return {
        gridRef,
        trackPointer,
        clearPointer,
        getPointerPosition,
    };
}
