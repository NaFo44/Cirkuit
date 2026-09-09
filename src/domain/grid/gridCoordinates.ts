import type { Position } from "./position";

export const CELL_SIZE = 20;

export function worldToGrid(x: number, y: number): Position {
    return {
        x: Math.floor(x / CELL_SIZE),
        y: Math.floor(y / CELL_SIZE),
    };
}

export function gridToWorld(x: number, y: number): { x: number; y: number } {
    return {
        x: x * CELL_SIZE,
        y: y * CELL_SIZE,
    };
}

export function cellsBetween(from: Position, to: Position): Position[] {
    const cells: Position[] = [];
    let x = from.x;
    let y = from.y;

    const deltaX = Math.abs(to.x - from.x);
    const deltaY = -Math.abs(to.y - from.y);
    const stepX = from.x < to.x ? 1 : -1;
    const stepY = from.y < to.y ? 1 : -1;
    let error = deltaX + deltaY;

    while (true) {
        cells.push({ x, y });

        if (x === to.x && y === to.y) {
            return cells;
        }

        const doubledError = 2 * error;

        if (doubledError >= deltaY) {
            error += deltaY;
            x += stepX;
        }

        if (doubledError <= deltaX) {
            error += deltaX;
            y += stepY;
        }
    }
}
