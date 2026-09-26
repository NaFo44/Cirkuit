import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import "./cellPreview.css";

interface CellPreviewProps {
    readonly position: { x: number; y: number } | null;
    readonly cellSize: number;
}

export function CellPreview({ position, cellSize }: CellPreviewProps) {
    if (position === null) {
        return null;
    }

    return (
        <div
            className="cell-preview"
            style={{
                left: position.x * CELL_SIZE,
                top: position.y * CELL_SIZE,
                width: cellSize,
                height: cellSize,
            }}
            aria-hidden="true"
        />
    );
}
