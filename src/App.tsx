import { useEffect, useMemo, useState } from "react";

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
import { defaultComponentRegistry } from "./domain/circuit/components/defaultComponentRegistry";
import type { PlacedComponent } from "./domain/circuit/placedComponent";
import type { EditorMode } from "./ui/editor/editorMode";
import { rotateClockwise } from "./domain/circuit/placedComponent";

const ROTATABLE_COMPONENT_TYPES: ReadonlySet<BuiltInComponentType> = new Set([
    "not",
]);

export function App() {
    const [mode, setMode] = useState<EditorMode>("edit");

    const [selectedTool, setSelectedTool] = useState<EditorTool>({
        kind: "component",
        componentType: "wire",
        rotation: 0,
    });

    const [circuit, setCircuit] = useState(() =>
        CircuitLayout.empty(GRID_DIMENSIONS.width, GRID_DIMENSIONS.height),
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                mode !== "edit" ||
                selectedTool.kind !== "component" ||
                !ROTATABLE_COMPONENT_TYPES.has(selectedTool.componentType) ||
                event.repeat ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.key.toLowerCase() !== "r"
            ) {
                return;
            }

            const target = event.target;

            if (
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target instanceof HTMLInputElement ||
                    target instanceof HTMLTextAreaElement ||
                    target instanceof HTMLSelectElement)
            ) {
                return;
            }

            event.preventDefault();

            setSelectedTool((currentTool) => {
                if (currentTool.kind !== "component") {
                    return currentTool;
                }

                return {
                    ...currentTool,
                    rotation: rotateClockwise(currentTool.rotation),
                };
            });
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [mode, selectedTool]);

    const { simulation, dispatchAction } = useCircuitSimulation(
        circuit,
        defaultComponentRegistry,
    );

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

    const isComponentInteractive = (component: PlacedComponent): boolean =>
        defaultComponentRegistry.get(component.type).primaryAction !==
        undefined;

    const interactWithComponent = (component: PlacedComponent) => {
        const actionType = defaultComponentRegistry.get(
            component.type,
        ).primaryAction;

        if (!actionType) {
            return;
        }

        dispatchAction({
            componentId: component.id,
            type: actionType,
        });
    };

    return (
        <main className="circuit-editor">
            <MapViewport>
                <CircuitGrid
                    circuit={circuit}
                    componentVisualStates={componentVisualStates}
                    onCellPaint={mode === "edit" ? paintCell : undefined}
                    onComponentInteract={
                        mode === "simulate" ? interactWithComponent : undefined
                    }
                    isComponentInteractive={isComponentInteractive}
                />
            </MapViewport>

            <ComponentPalette
                mode={mode}
                selectedTool={selectedTool}
                onModeChange={setMode}
                onSelectComponent={selectComponent}
                onSelectEraser={selectEraser}
            />
        </main>
    );
}
