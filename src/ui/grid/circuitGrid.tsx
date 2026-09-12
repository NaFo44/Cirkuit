import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import {
    CELL_SIZE,
    cellsBetween,
    gridToWorld,
    worldToGrid,
} from "../../domain/grid/gridCoordinates";
import type { Position } from "../../domain/grid/position";

interface CircuitGridProps {
    circuit: CircuitLayout;
    onCellPaint?: (position: Position) => void;
}

export function CircuitGrid({ circuit, onCellPaint }: CircuitGridProps) {
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

        if (x < 0 || y < 0 || x >= circuit.width || y >= circuit.height) {
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
            onCellPaint?.(cell);
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

    return (
        <div
            className="circuit-grid"
            style={{
                width: circuit.width * CELL_SIZE,
                height: circuit.height * CELL_SIZE,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
            role="grid"
            aria-label="Circuit grid"
            aria-rowcount={circuit.height}
            aria-colcount={circuit.width}
            onPointerDown={startPainting}
            onPointerMove={continuePainting}
            onPointerUp={stopPainting}
            onPointerCancel={cancelPainting}
            onLostPointerCapture={cancelPainting}
        >
            {circuit.components.map((component) => {
                const { x, y } = component.position;
                const position = gridToWorld(x, y);

                return (
                    <div
                        key={component.id}
                        role="gridcell"
                        className={`circuit-component circuit-cell--${component.type}`}
                        style={{
                            left: position.x + 1,
                            top: position.y + 1,
                            width: CELL_SIZE - 1,
                            height: CELL_SIZE - 1,
                        }}
                        aria-label={`Cell ${x},${y}: ${component.type}`}
                        aria-rowindex={y + 1}
                        aria-colindex={x + 1}
                    />
                );
            })}
        </div>
    );
}
