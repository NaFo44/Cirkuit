import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import type { Position } from "../../domain/grid/position";

export interface SelectionOutlineSegment {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
}

interface Cell {
    readonly x: number;
    readonly y: number;
}

function cellKey(cell: Cell): string {
    return `${cell.x},${cell.y}`;
}

function hasCell(cells: ReadonlySet<string>, cell: Cell): boolean {
    return cells.has(cellKey(cell));
}

export function createSelectionOutline(
    components: readonly PlacedComponent[],
    offset: Position = { x: 0, y: 0 },
): readonly SelectionOutlineSegment[] {
    const cells = new Set(
        components.map((component) =>
            cellKey({
                x: component.position.x + offset.x,
                y: component.position.y + offset.y,
            }),
        ),
    );

    const segments: SelectionOutlineSegment[] = [];

    for (const component of components) {
        const x = component.position.x + offset.x;
        const y = component.position.y + offset.y;

        const left = x * CELL_SIZE;
        const top = y * CELL_SIZE;
        const right = left + CELL_SIZE;
        const bottom = top + CELL_SIZE;

        if (!hasCell(cells, { x, y: y - 1 })) {
            segments.push({
                x1: left,
                y1: top,
                x2: right,
                y2: top,
            });
        }

        if (!hasCell(cells, { x: x + 1, y })) {
            segments.push({
                x1: right,
                y1: top,
                x2: right,
                y2: bottom,
            });
        }

        if (!hasCell(cells, { x, y: y + 1 })) {
            segments.push({
                x1: left,
                y1: bottom,
                x2: right,
                y2: bottom,
            });
        }

        if (!hasCell(cells, { x: x - 1, y })) {
            segments.push({
                x1: left,
                y1: top,
                x2: left,
                y2: bottom,
            });
        }
    }

    return segments;
}
