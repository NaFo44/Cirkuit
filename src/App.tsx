import { useMemo, useState } from "react";

import { CircuitLayout } from "./domain/circuit/circuitLayout";
import type { BuiltInComponentType } from "./domain/circuit/components/componentType";
import {
    rotateClockwise,
    type Rotation,
} from "./domain/circuit/placedComponent";
import { GRID_DIMENSIONS } from "./domain/grid/gridDimensions";
import type { Position } from "./domain/grid/position";
import { createComponentVisualStates } from "./ui/components/componentVisualState";
import { createPlacedComponent } from "./ui/editor/createPlacedComponent";
import { CircuitGrid } from "./ui/grid/circuitGrid";
import { ComponentPalette } from "./ui/palette/componentPalette";
import { useCircuitSimulation } from "./ui/simulation/useCircuitSimulation";
import { MapViewport } from "./ui/viewport/mapViewport";

export function App() {
    const [selectedComponent, setSelectedComponent] =
        useState<BuiltInComponentType>("wire");
    const [selectedRotation, setSelectedRotation] = useState<Rotation>(0);

    const [circuit, setCircuit] = useState(() =>
        CircuitLayout.empty(GRID_DIMENSIONS.width, GRID_DIMENSIONS.height),
    );

    const simulation = useCircuitSimulation(circuit);

    const componentVisualStates = useMemo(
        () => createComponentVisualStates(simulation),
        [simulation],
    );

    const selectComponent = (component: BuiltInComponentType) => {
        if (component === selectedComponent && component !== "wire") {
            setSelectedRotation(rotateClockwise);
            return;
        }

        setSelectedComponent(component);
    };

    const paintComponent = (position: Position) => {
        setCircuit((currentCircuit) => {
            const existing = currentCircuit.getComponentAt(position);

            if (
                existing?.type === selectedComponent &&
                existing.rotation === selectedRotation
            ) {
                return currentCircuit;
            }

            return currentCircuit.withComponent(
                createPlacedComponent(
                    selectedComponent,
                    position,
                    selectedRotation,
                ),
            );
        });
    };

    return (
        <main className="circuit-editor">
            <MapViewport>
                <CircuitGrid
                    circuit={circuit}
                    componentVisualStates={componentVisualStates}
                    onCellPaint={paintComponent}
                />
            </MapViewport>

            <ComponentPalette
                selectedComponent={selectedComponent}
                selectedRotation={selectedRotation}
                onSelect={selectComponent}
            />
        </main>
    );
}
