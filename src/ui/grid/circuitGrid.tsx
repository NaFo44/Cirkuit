import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { Grid } from "../../domain/grid/grid";
import {
    CELL_SIZE,
    cellsBetween,
    gridToWorld,
    worldToGrid,
} from "../../domain/grid/gridCoordinates";
import type { Position } from "../../domain/grid/position";

interface CircuitGridProps {
    grid: Grid;
    width: number;
    height: number;
    onCellPaint?: (x: number, y: number) => void;
}

export function CircuitGrid({
    grid,
    width,
    height,
    onCellPaint,
}: CircuitGridProps) {
    const activePointerId = useRef<number | null>(null);
    const lastPaintedCell = useRef<Position | null>(null);

    const paintAtPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
        const gridElement = event.currentTarget;
        const bounds = gridElement.getBoundingClientRect();

        const scaleX = bounds.width / gridElement.offsetWidth;
        const scaleY = bounds.height / gridElement.offsetHeight;

        const localX =
            (event.clientX - bounds.left) / scaleX - gridElement.clientLeft;
        const localY =
            (event.clientY - bounds.top) / scaleY - gridElement.clientTop;
        const position = worldToGrid(localX, localY);
        const { x, y } = position;

        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const previousCell = lastPaintedCell.current;

        if (previousCell?.x === x && previousCell.y === y) {
            return;
        }

        const cells = previousCell
            ? cellsBetween(previousCell, position).slice(1)
            : [position];

        lastPaintedCell.current = position;

        for (const cell of cells) {
            onCellPaint?.(cell.x, cell.y);
        }
    };

    const startPainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (
            event.button !== 0 ||
            activePointerId.current !== null ||
            !onCellPaint
        ) {
            return;
        }

        event.preventDefault();

        activePointerId.current = event.pointerId;
        lastPaintedCell.current = null;

        event.currentTarget.setPointerCapture(event.pointerId);
        paintAtPointer(event);
    };

    const continuePainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointerId.current === event.pointerId) {
            paintAtPointer(event);
        }
    };

    const stopPainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointerId.current !== event.pointerId) {
            return;
        }

        paintAtPointer(event);

        activePointerId.current = null;
        lastPaintedCell.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const cancelPainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointerId.current === event.pointerId) {
            activePointerId.current = null;
            lastPaintedCell.current = null;
        }
    };

    const components = [];

    for (const [{ x, y }, cell] of grid.entries()) {
        if (
            cell.type === "empty" ||
            x < 0 ||
            y < 0 ||
            x >= width ||
            y >= height
        ) {
            continue;
        }

        const position = gridToWorld(x, y);

        components.push(
            <div
                key={`${x},${y}`}
                role="gridcell"
                className={`circuit-component circuit-cell--${cell.type}`}
                style={{
                    left: position.x + 1,
                    top: position.y + 1,
                    width: CELL_SIZE - 1,
                    height: CELL_SIZE - 1,
                }}
                aria-label={`Cellule ${x},${y}: ${cell.type}`}
                aria-rowindex={y + 1}
                aria-colindex={x + 1}
            />,
        );
    }

    return (
        <div
            className="circuit-grid"
            style={{
                width: width * CELL_SIZE,
                height: height * CELL_SIZE,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
            role="grid"
            aria-label="Grille du circuit"
            aria-rowcount={height}
            aria-colcount={width}
            onPointerDown={startPainting}
            onPointerMove={continuePainting}
            onPointerUp={stopPainting}
            onPointerCancel={cancelPainting}
            onLostPointerCapture={cancelPainting}
        >
            {components}
        </div>
    );
}
