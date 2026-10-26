import type { ComponentCatalog } from "../../domain/circuit/componentDefinition";
import { getOccupiedCells } from "../../domain/circuit/componentGeometry";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import type { Position } from "../../domain/grid/position";

export interface SelectionOutlineSegment {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
}

function cellKey(position: Position): string {
    return `${position.x},${position.y}`;
}

export function createSelectionOutline(
    components: readonly PlacedComponent[],
    offset: Position = { x: 0, y: 0 },
    registry: ComponentCatalog = defaultComponentRegistry,
): readonly SelectionOutlineSegment[] {
    const cells = new Map<string, Position>();

    for (const component of components) {
        for (const { position } of getOccupiedCells(
            component,
            registry.get(component.type),
        )) {
            const cell = {
                x: position.x + offset.x,
                y: position.y + offset.y,
            };
            cells.set(cellKey(cell), cell);
        }
    }

    const segments: SelectionOutlineSegment[] = [];

    for (const { x, y } of cells.values()) {
        const left = x * CELL_SIZE;
        const top = y * CELL_SIZE;
        const right = left + CELL_SIZE;
        const bottom = top + CELL_SIZE;

        if (!cells.has(cellKey({ x, y: y - 1 }))) {
            segments.push({
                x1: left,
                y1: top,
                x2: right,
                y2: top,
            });
        }

        if (!cells.has(cellKey({ x: x + 1, y }))) {
            segments.push({
                x1: right,
                y1: top,
                x2: right,
                y2: bottom,
            });
        }

        if (!cells.has(cellKey({ x, y: y + 1 }))) {
            segments.push({
                x1: left,
                y1: bottom,
                x2: right,
                y2: bottom,
            });
        }

        if (!cells.has(cellKey({ x: x - 1, y }))) {
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
