import type { Position } from "./position";

export const CELL_SIZE = 20;

export function worldToGrid(
    x: number,
    y: number,
): Position {
    return {
        x: Math.floor(x / CELL_SIZE),
        y: Math.floor(y / CELL_SIZE),
    };
}

export function gridToWorld(
    x: number,
    y: number,
): { x: number; y: number } {
    return {
        x: x * CELL_SIZE,
        y: y * CELL_SIZE,
    };
}