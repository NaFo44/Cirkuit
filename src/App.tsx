import { useState } from "react";

import type { ComponentType } from "./domain/grid/cell";
import { GRID_DIMENSIONS } from "./domain/grid/gridDimensions";
import { Grid } from "./domain/grid/grid";
import { CircuitGrid } from "./ui/grid/circuitGrid";
import { ComponentPalette } from "./ui/palette/componentPalette";
import { MapViewport } from "./ui/viewport/mapViewport";

export function App() {
    const [selectedComponent, setSelectedComponent] =
        useState<ComponentType>("wire");

    const [grid, setGrid] = useState(() =>
        Grid.empty()
            .withCell(0, 0, { type: "source" })
            .withCell(1, 0, { type: "wire" })
            .withCell(2, 0, { type: "light" }),
    );

    const handleCellPaint = (x: number, y: number) => {
        setGrid((currentGrid) =>
            currentGrid.withCell(x, y, { type: selectedComponent }),
        );
    };

    return (
        <main className="circuit-editor">
            <MapViewport>
                <CircuitGrid
                    grid={grid}
                    width={GRID_DIMENSIONS.width}
                    height={GRID_DIMENSIONS.height}
                    onCellPaint={handleCellPaint}
                />
            </MapViewport>
            <ComponentPalette
                selectedComponent={selectedComponent}
                onSelect={setSelectedComponent}
            />
        </main>
    );
}
