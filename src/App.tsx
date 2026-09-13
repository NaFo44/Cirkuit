import { useMemo, useState } from "react";

import { CircuitLayout } from "./domain/circuit/circuitLayout";
import type { BuiltInComponentType } from "./domain/circuit/components/componentType";
import { GRID_DIMENSIONS } from "./domain/grid/gridDimensions";
import type { Position } from "./domain/grid/position";
import { createComponentVisualStates } from "./ui/components/componentVisualState";
import { CircuitGrid } from "./ui/grid/circuitGrid";
import { ComponentPalette } from "./ui/palette/componentPalette";
import { useCircuitSimulation } from "./ui/simulation/useCircuitSimulation";
import { MapViewport } from "./ui/viewport/mapViewport";
import type { EditorTool } from "./ui/editor/editorTool";
import { applyEditorTool } from "./ui/editor/applyEditorTool";

export function App() {
    const [selectedTool, setSelectedTool] = useState<EditorTool>({
        kind: "component",
        componentType: "wire",
        rotation: 0,
    });

    const [circuit, setCircuit] = useState(() =>
        CircuitLayout.empty(GRID_DIMENSIONS.width, GRID_DIMENSIONS.height),
    );

    const simulation = useCircuitSimulation(circuit);

    const componentVisualStates = useMemo(
        () => createComponentVisualStates(simulation),
        [simulation],
    );

    const selectEraser = () => {
        setSelectedTool({
            kind: "eraser",
        });
    };

    const selectComponent = (componentType: BuiltInComponentType) => {
        setSelectedTool({
            kind: "component",
            componentType,
            rotation: 0,
        });
    };

    const paintCell = (position: Position) => {
        setCircuit((currentCircuit) =>
            applyEditorTool(currentCircuit, selectedTool, position),
        );
    };

    return (
        <main className="circuit-editor">
            <MapViewport>
                <CircuitGrid
                    circuit={circuit}
                    componentVisualStates={componentVisualStates}
                    onCellPaint={paintCell}
                />
            </MapViewport>

            <ComponentPalette
                selectedTool={selectedTool}
                onSelectComponent={selectComponent}
                onSelectEraser={selectEraser}
            />
        </main>
    );
}
