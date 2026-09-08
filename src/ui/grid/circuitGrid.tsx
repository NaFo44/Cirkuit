import {
    useRef,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";

import type { Grid } from "../../domain/grid/grid";
import {
    CELL_SIZE,
    cellsBetween,
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

    const paintAtPointer = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        const gridElement = event.currentTarget;
        const bounds = gridElement.getBoundingClientRect();

        const localX = event.clientX - bounds.left - gridElement.clientLeft;
        const localY = event.clientY - bounds.top - gridElement.clientTop;
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

    const startPainting = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        if (
            event.button !== 0
            || activePointerId.current !== null
            || !onCellPaint
        ) {
            return;
        }

        event.preventDefault();

        activePointerId.current = event.pointerId;
        lastPaintedCell.current = null;

        event.currentTarget.setPointerCapture(event.pointerId);
        paintAtPointer(event);
    };

    const continuePainting = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        if (activePointerId.current === event.pointerId) {
            paintAtPointer(event);
        }
    };

    const stopPainting = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
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

    const cancelPainting = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        if (activePointerId.current === event.pointerId) {
            activePointerId.current = null;
            lastPaintedCell.current = null;
        }
    };

    const paintWithKeyboard = (
        event: ReactMouseEvent<HTMLButtonElement>,
        x: number,
        y: number,
    ) => {
        const isKeyboardActivation = event.detail === 0;

        if (isKeyboardActivation) {
            onCellPaint?.(x, y);
        }
    };

    const cells = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = grid.get(x, y);

            cells.push(
                <button
                    key={`${x},${y}`}
                    type="button"
                    className={`circuit-cell circuit-cell--${cell.type}`}
                    onClick={(event) => paintWithKeyboard(event, x, y)}
                    aria-label={`Cellule ${x},${y}`}
                />,
            );
        }
    }

    return (
        <div
            className="circuit-grid"
            style={{
                gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${height}, ${CELL_SIZE}px)`,
            }}
            onPointerDown={startPainting}
            onPointerMove={continuePainting}
            onPointerUp={stopPainting}
            onPointerCancel={cancelPainting}
            onLostPointerCapture={cancelPainting}
        >
            {cells}
        </div>
    );
}
