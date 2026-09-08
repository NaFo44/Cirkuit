import type { Grid } from "../../domain/grid/grid";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";

interface CircuitGridProps {
    grid: Grid;
    width: number;
    height: number;
    onCellClick?: (x: number, y: number) => void;
}

export function CircuitGrid({
    grid,
    width,
    height,
    onCellClick,
}: CircuitGridProps) {
    const cells = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = grid.get(x, y);

            cells.push(
                <button
                    key={`${x},${y}`}
                    type="button"
                    className={`circuit-cell circuit-cell--${cell.type}`}
                    onClick={() => onCellClick?.(x, y)}
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
        >
            {cells}
        </div>
    );
}
