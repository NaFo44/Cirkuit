import { useState } from "react";

import { CircuitLayout } from "./domain/circuit/circuitLayout";
import type { BuiltInComponentType } from "./domain/circuit/components/componentType";
import { GRID_DIMENSIONS } from "./domain/grid/gridDimensions";
import type { Position } from "./domain/grid/position";
import { createPlacedComponent } from "./ui/editor/createPlacedComponent";
import { CircuitGrid } from "./ui/grid/circuitGrid";
import { ComponentPalette } from "./ui/palette/componentPalette";
import { MapViewport } from "./ui/viewport/mapViewport";

export function App() {
    const [selectedComponent, setSelectedComponent] =
        useState<BuiltInComponentType>("wire");

    const [circuit, setCircuit] = useState(() =>
        CircuitLayout.empty(GRID_DIMENSIONS.width, GRID_DIMENSIONS.height),
    );

    const paintComponent = (position: Position) => {
        setCircuit((currentCircuit) => {
            const existing = currentCircuit.getComponentAt(position);

            if (existing?.type === selectedComponent) {
                return currentCircuit;
            }

            return currentCircuit.withComponent(
                createPlacedComponent(selectedComponent, position),
            );
        });
    };

    return (
        <main className="circuit-editor">
            <MapViewport>
                <CircuitGrid circuit={circuit} onCellPaint={paintComponent} />
            </MapViewport>

            <ComponentPalette
                selectedComponent={selectedComponent}
                onSelect={setSelectedComponent}
            />
        </main>
    );
}
