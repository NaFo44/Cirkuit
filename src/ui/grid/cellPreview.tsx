import type { ComponentFootprint } from "../../domain/circuit/componentDefinition";
import "./cellPreview.css";

interface CellPreviewProps {
    readonly position: { x: number; y: number } | null;
    readonly cellSize: number;
    readonly footprint?: ComponentFootprint;
}

export function CellPreview({
    position,
    cellSize,
    footprint = { width: 1, height: 1 },
}: CellPreviewProps) {
    if (position === null) {
        return null;
    }

    return (
        <div
            className="cell-preview"
            style={{
                left: position.x * cellSize,
                top: position.y * cellSize,
                width: footprint.width * cellSize,
                height: footprint.height * cellSize,
            }}
            aria-hidden="true"
        />
    );
}
