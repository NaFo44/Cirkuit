import { useCallback, useMemo, useState } from "react";

import { defaultComponentRegistry } from "./domain/circuit/components/builtInComponents";
import {
    createComponentVisualStates,
    type ComponentVisualState,
} from "./ui/components/componentVisualState";
import { CircuitGrid } from "./ui/grid/circuitGrid";
import { ComponentPalette } from "./ui/palette/componentPalette";
import { useCircuitSimulation } from "./ui/simulation/useCircuitSimulation";
import { MapViewport } from "./ui/viewport/mapViewport";
import type { PlacedComponent } from "./domain/circuit/placedComponent";
import type { EditorMode } from "./ui/editor/editorMode";
import { CELL_SIZE } from "./domain/grid/gridCoordinates";
import { getComponentHoverLabel } from "./ui/components/componentPresentation";
import { QuickStart } from "./ui/guide/quickStart";
import { AnnotationLayer } from "./ui/annotations/annotationLayer";
import { isCircuitEditorTool } from "./ui/editor/editorTool";
import { ProjectActions } from "./ui/project/projectActions";
import { useProjectEditor } from "./ui/project/useProjectEditor";
import { useProjectFileActions } from "./ui/project/useProjectFileActions";
import type { CircuitProject } from "./domain/project/circuitProject";
import { useSaveShortcut } from "./ui/project/useSaveShortcut";
import { useEditorToolSelection } from "./ui/editor/useEditorToolSelection";
import { CircuitLayout } from "./domain/circuit/circuitLayout";
import { GRID_DIMENSIONS } from "./domain/grid/gridDimensions";
import type { Position } from "./domain/grid/position";

const EMPTY_COMPONENT_VISUAL_STATES: ReadonlyMap<string, ComponentVisualState> =
    new Map();

function createInitialProject(): CircuitProject {
    return {
        circuit: CircuitLayout.empty(
            GRID_DIMENSIONS.width,
            GRID_DIMENSIONS.height,
        ),
        annotations: [],
    };
}

export function App() {
    const [mode, setMode] = useState<EditorMode>("edit");

    const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(
        null,
    );

    const {
        selectedTool,
        selectedAnnotationType,
        selectComponent,
        selectEraser,
        selectAnnotation,
    } = useEditorToolSelection({
        mode,
    });

    const {
        project,
        revision: projectRevision,
        paintCell: paintProjectCell,
        addAnnotation,
        updateAnnotation,
        removeAnnotation,
        replaceProject,
    } = useProjectEditor(createInitialProject);

    const { circuit, annotations } = project;

    const paintCell = useCallback(
        (position: Position) => {
            if (isCircuitEditorTool(selectedTool)) {
                paintProjectCell(selectedTool, position);
            }
        },
        [paintProjectCell, selectedTool],
    );

    const handleProjectOpen = useCallback(
        (importedProject: CircuitProject) => {
            setMode("edit");
            setHoveredComponentId(null);
            replaceProject(importedProject);
        },
        [replaceProject],
    );

    const {
        error: projectFileError,
        openProject,
        saveProject,
    } = useProjectFileActions({
        project,
        registry: defaultComponentRegistry,
        onProjectOpen: handleProjectOpen,
    });

    useSaveShortcut(saveProject);

    const hoveredComponent =
        hoveredComponentId === null
            ? undefined
            : circuit.getComponentById(hoveredComponentId);

    const {
        simulation,
        error: simulationError,
        dispatchAction,
    } = useCircuitSimulation(
        circuit,
        defaultComponentRegistry,
        mode === "simulate",
    );

    const componentVisualStates = useMemo(
        () =>
            simulation
                ? createComponentVisualStates(simulation)
                : EMPTY_COMPONENT_VISUAL_STATES,
        [simulation],
    );

    const hoveredComponentLabel = hoveredComponent
        ? getComponentHoverLabel(
              hoveredComponent.type,
              componentVisualStates.get(hoveredComponent.id) ?? "default",
          )
        : null;

    const isComponentInteractive = (component: PlacedComponent): boolean =>
        defaultComponentRegistry.get(component.type).primaryAction !==
        undefined;

    const interactWithComponent = useCallback(
        (component: PlacedComponent) => {
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
        },
        [dispatchAction],
    );

    const canvasWidth = circuit.width * CELL_SIZE;
    const canvasHeight = circuit.height * CELL_SIZE;

    const annotationLayerEditable =
        mode === "edit" && selectedAnnotationType !== null;

    return (
        <main className="circuit-editor">
            <MapViewport key={projectRevision} cellSize={CELL_SIZE}>
                <div
                    className="circuit-canvas"
                    style={{
                        width: canvasWidth,
                        height: canvasHeight,
                    }}
                >
                    <CircuitGrid
                        circuit={circuit}
                        componentVisualStates={componentVisualStates}
                        onCellPaint={
                            mode === "edit" && isCircuitEditorTool(selectedTool)
                                ? paintCell
                                : undefined
                        }
                        onComponentInteract={
                            mode === "simulate" && simulation
                                ? interactWithComponent
                                : undefined
                        }
                        isComponentInteractive={isComponentInteractive}
                        onHoveredComponentChange={setHoveredComponentId}
                    />

                    <AnnotationLayer
                        key={
                            annotationLayerEditable
                                ? "annotations-editable"
                                : "annotations-readonly"
                        }
                        width={canvasWidth}
                        height={canvasHeight}
                        annotations={annotations}
                        annotationTool={
                            annotationLayerEditable
                                ? selectedAnnotationType
                                : null
                        }
                        onAdd={addAnnotation}
                        onUpdate={updateAnnotation}
                        onRemove={removeAnnotation}
                    />
                </div>
            </MapViewport>

            <QuickStart
                footer={
                    <ProjectActions
                        error={projectFileError}
                        onOpen={openProject}
                        onSave={saveProject}
                    />
                }
            />

            <ComponentPalette
                mode={mode}
                selectedTool={selectedTool}
                onModeChange={setMode}
                onSelectComponent={selectComponent}
                onSelectEraser={selectEraser}
                onSelectAnnotation={selectAnnotation}
            />

            {hoveredComponentLabel && selectedTool.kind !== "annotation" && (
                <div className="circuit-hover-label" aria-hidden="true">
                    {hoveredComponentLabel}
                </div>
            )}

            {simulationError && (
                <div className="simulation-error" role="alert">
                    Simulation error: {simulationError}
                </div>
            )}
        </main>
    );
}
