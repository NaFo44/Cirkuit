import { useCallback, useMemo, useRef, useState } from "react";

import { defaultComponentRegistry } from "./domain/circuit/components/builtInComponents";
import {
    createComponentVisualStates,
    type ComponentVisualState,
} from "./ui/components/componentVisualState";
import { CircuitGrid } from "./ui/grid/circuitGrid";
import { ComponentPalette } from "./ui/palette/componentPalette";
import { useCircuitSimulation } from "./ui/simulation/useCircuitSimulation";
import { MapViewport, type MapViewportHandle } from "./ui/viewport/mapViewport";
import type { PlacedComponent } from "./domain/circuit/placedComponent";
import type { EditorMode } from "./ui/editor/editorMode";
import { CELL_SIZE } from "./domain/grid/gridCoordinates";
import { getComponentHoverLabel } from "./ui/components/componentPresentation";
import { EditorHints } from "./ui/editor/editorHints";
import { WorkspaceSidebar } from "./ui/sidebar/workspaceSidebar";
import {
    WorkspaceIntroduction,
    WorkspaceLinks,
} from "./ui/sidebar/workspaceSidebarSections";
import { AnnotationLayer } from "./ui/annotations/annotationLayer";
import { isCircuitEditorTool } from "./ui/editor/editorTool";
import { ProjectActions } from "./ui/project/projectActions";
import { useProjectEditor } from "./ui/project/useProjectEditor";
import { useProjectFileActions } from "./ui/project/useProjectFileActions";
import type { CircuitProject } from "./domain/project/circuitProject";
import { useSaveShortcut } from "./ui/project/useSaveShortcut";
import { useEditorToolSelection } from "./ui/editor/useEditorToolSelection";
import { useToggleSimulationShortcut } from "./ui/editor/useToggleSimulationShortcut";
import { createDefaultProject } from "./demo/defaultProject";
import type { Position } from "./domain/grid/position";
import { SelectionLayer } from "./ui/selection/selectionLayer";
import { useComponentSelection } from "./ui/selection/useComponentSelection";
import { useGridPointerPosition } from "./ui/grid/useGridPointerPosition";
import { useUndoShortcut } from "./ui/project/useHistoryShortcut";

const EMPTY_COMPONENT_VISUAL_STATES: ReadonlyMap<string, ComponentVisualState> =
    new Map();

export function App() {
    const [mode, setMode] = useState<EditorMode>("edit");
    const mapViewportRef = useRef<MapViewportHandle>(null);

    const toggleMode = useCallback(() => {
        setMode((currentMode) =>
            currentMode === "edit" ? "simulate" : "edit",
        );
    }, []);

    useToggleSimulationShortcut(toggleMode);

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
        beginPaint,
        paintCell: paintProjectCell,
        endPaint,
        undo,
        redo,
        updateCircuit,
        addAnnotation,
        updateAnnotation,
        removeAnnotation,
        replaceProject,
    } = useProjectEditor(createDefaultProject);

    useUndoShortcut({
        undo,
        redo,
    });

    const { circuit, annotations } = project;

    const canvasWidth = circuit.width * CELL_SIZE;
    const canvasHeight = circuit.height * CELL_SIZE;

    const {
        gridRef: canvasRef,
        trackPointer: trackCanvasPointer,
        clearPointer: clearCanvasPointer,
        getPointerPosition: getPastePosition,
    } = useGridPointerPosition({
        width: circuit.width,
        height: circuit.height,
        cellSize: CELL_SIZE,
    });

    const {
        isSelectionModifierPressed,
        selectedComponentIds,
        selectRectangle,
        canMoveSelection,
        moveSelection,
        clearSelection,
        resetSelectionState,
    } = useComponentSelection({
        enabled: mode === "edit",
        circuit,
        getPastePosition,
        onCircuitChange: updateCircuit,
    });

    const selectedComponents = useMemo(
        () =>
            circuit.components.filter((component) =>
                selectedComponentIds.has(component.id),
            ),
        [circuit, selectedComponentIds],
    );

    const paintCell = useCallback(
        (position: Position) => {
            if (!isCircuitEditorTool(selectedTool)) {
                return;
            }

            clearSelection();
            paintProjectCell(selectedTool, position);
        },
        [clearSelection, paintProjectCell, selectedTool],
    );

    const handlePaintStart = useCallback(() => {
        if (!isCircuitEditorTool(selectedTool)) {
            return;
        }

        beginPaint();
    }, [beginPaint, selectedTool]);

    const handlePaintEnd = useCallback(() => {
        endPaint();
    }, [endPaint]);

    const handleProjectOpen = useCallback(
        (importedProject: CircuitProject) => {
            setMode("edit");
            setHoveredComponentId(null);
            resetSelectionState();
            replaceProject(importedProject);
        },
        [replaceProject, resetSelectionState],
    );

    const getViewport = useCallback(
        () => mapViewportRef.current?.getCamera(),
        [],
    );

    const {
        error: projectFileError,
        openProject,
        saveProject,
    } = useProjectFileActions({
        project,
        registry: defaultComponentRegistry,
        onProjectOpen: handleProjectOpen,
        getViewport,
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

    const annotationLayerEditable =
        mode === "edit" && selectedAnnotationType !== null;

    const selectionInteractionMode =
        mode !== "edit"
            ? "disabled"
            : isSelectionModifierPressed
              ? "select"
              : selectedAnnotationType === null
                ? "move"
                : "disabled";

    return (
        <main className="circuit-editor">
            <MapViewport
                ref={mapViewportRef}
                key={projectRevision}
                cellSize={CELL_SIZE}
                initialCamera={project.viewport}
            >
                <div
                    ref={canvasRef}
                    className="circuit-canvas"
                    style={{
                        width: canvasWidth,
                        height: canvasHeight,
                    }}
                    onPointerDownCapture={trackCanvasPointer}
                    onPointerMoveCapture={trackCanvasPointer}
                    onPointerLeave={clearCanvasPointer}
                >
                    <CircuitGrid
                        circuit={circuit}
                        selectedComponentIds={
                            mode === "edit" ? selectedComponentIds : undefined
                        }
                        componentVisualStates={componentVisualStates}
                        onPaintStart={
                            mode === "edit" && isCircuitEditorTool(selectedTool)
                                ? handlePaintStart
                                : undefined
                        }
                        onCellPaint={
                            mode === "edit" && isCircuitEditorTool(selectedTool)
                                ? paintCell
                                : undefined
                        }
                        onPaintEnd={
                            mode === "edit" && isCircuitEditorTool(selectedTool)
                                ? handlePaintEnd
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

                    <SelectionLayer
                        width={canvasWidth}
                        height={canvasHeight}
                        interactionMode={selectionInteractionMode}
                        selectedComponents={selectedComponents}
                        onSelect={selectRectangle}
                        canMove={canMoveSelection}
                        onMove={moveSelection}
                    />
                </div>
            </MapViewport>

            <WorkspaceSidebar
                topContent={<WorkspaceIntroduction />}
                bottomContent={
                    <ProjectActions
                        error={projectFileError}
                        onOpen={openProject}
                        onSave={saveProject}
                    />
                }
                footer={<WorkspaceLinks />}
            >
                <EditorHints mode={mode} />
            </WorkspaceSidebar>

            <ComponentPalette
                mode={mode}
                selectedTool={selectedTool}
                onToggleMode={toggleMode}
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
