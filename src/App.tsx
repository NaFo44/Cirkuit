import { useState } from "react";

import { Grid } from "./domain/grid/grid";
import { CircuitGrid } from "./ui/grid/circuitGrid";

export function App() {
    const [grid, setGrid] = useState(() =>
        Grid.empty()
            .withCell(0, 0, { type: "source" })
            .withCell(1, 0, { type: "wire" })
            .withCell(2, 0, { type: "light" }),
    );

    const handleCellPaint = (x: number, y: number) => {
        setGrid((currentGrid) =>
            currentGrid.withCell(x, y, { type: "wire" }),
        );
    };

    return (
        <CircuitGrid
            grid={grid}
            width={32}
            height={24}
            onCellPaint={handleCellPaint}
        />
    );
}
