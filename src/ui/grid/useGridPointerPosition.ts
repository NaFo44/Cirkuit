import {
    useCallback,
    useRef,
    useState,
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

    readonly pointerPosition: Position | null;

    readonly trackPointer: (event: ReactPointerEvent<HTMLDivElement>) => void;

    readonly clearPointer: () => void;

    readonly getPointerPosition: () => Position | null;
}

export function useGridPointerPosition({
    width,
    height,
    cellSize,
}: UseGridPointerPositionOptions): GridPointerPosition {
    const [pointerPosition, setPointerPosition] = useState<Position | null>(
        null,
    );

    const canvasWidth = width * cellSize;
    const canvasHeight = height * cellSize;

    const gridRef = useRef<HTMLDivElement>(null);

    const pointerRef = useRef<{
        readonly clientX: number;
        readonly clientY: number;
    } | null>(null);

    const getPositionFromPointer = useCallback(
        (clientX: number, clientY: number): Position | null => {
            const grid = gridRef.current;

            if (!grid) {
                return null;
            }

            const bounds = grid.getBoundingClientRect();

            if (
                clientX < bounds.left ||
                clientX >= bounds.right ||
                clientY < bounds.top ||
                clientY >= bounds.bottom
            ) {
                return null;
            }

            const canvasPoint = screenToCanvasPoint({
                width: canvasWidth,
                height: canvasHeight,
                clientX,
                clientY,
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
        },
        [canvasHeight, canvasWidth, cellSize, height, width],
    );

    const trackPointer = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            pointerRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
            };

            setPointerPosition(
                getPositionFromPointer(event.clientX, event.clientY),
            );
        },
        [getPositionFromPointer],
    );

    const clearPointer = useCallback(() => {
        pointerRef.current = null;
        setPointerPosition(null);
    }, []);

    const getPointerPosition = useCallback((): Position | null => {
        const pointer = pointerRef.current;

        if (!pointer) {
            return null;
        }

        return getPositionFromPointer(pointer.clientX, pointer.clientY);
    }, [getPositionFromPointer]);

    return {
        gridRef,
        pointerPosition,
        trackPointer,
        clearPointer,
        getPointerPosition,
    };
}
