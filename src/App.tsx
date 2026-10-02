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
import { CellPreview } from "./ui/grid/cellPreview";
import { HistoryActions } from "./ui/editor/historyActions";
import type { CircuitLayer } from "./domain/circuit/placedComponent";
import { ChevronDown, ChevronUp } from "pixelarticons/react";
import { WorkspaceSidebarContainer } from "./ui/sidebar/workspaceSidebarContainer";
import { SidebarDocs } from "./ui/sidebar/sidebarDocs";

const EMPTY_COMPONENT_VISUAL_STATES: ReadonlyMap<string, ComponentVisualState> =
    new Map();

export function App() {
    const [mode, setMode] = useState<EditorMode>("edit");
    const [activeLayer, setActiveLayer] = useState<CircuitLayer>(0);
    const [docsOpen, setDocsOpen] = useState(false);
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
        canUndo,
        canRedo,
        updateCircuit,
        removeComponents,
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
        pointerPosition,
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
        activeLayer,
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
            paintProjectCell(selectedTool, position, activeLayer);
        },
        [activeLayer, clearSelection, paintProjectCell, selectedTool],
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
            setActiveLayer(0);
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

    const openDocs = useCallback(() => {
        setDocsOpen(true);
    }, []);

    const closeDocs = useCallback(() => {
        setDocsOpen(false);
    }, []);

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

    const canPaint = mode === "edit" && isCircuitEditorTool(selectedTool);

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
                        activeLayer={activeLayer}
                        selectedComponentIds={
                            mode === "edit" ? selectedComponentIds : undefined
                        }
                        componentVisualStates={componentVisualStates}
                        onPaintStart={canPaint ? handlePaintStart : undefined}
                        onCellPaint={canPaint ? paintCell : undefined}
                        onPaintEnd={canPaint ? handlePaintEnd : undefined}
                        onComponentInteract={
                            mode === "simulate" && simulation
                                ? interactWithComponent
                                : undefined
                        }
                        isComponentInteractive={isComponentInteractive}
                        onHoveredComponentChange={setHoveredComponentId}
                    />

                    <CellPreview
                        position={
                            canPaint && selectedAnnotationType === null
                                ? pointerPosition
                                : null
                        }
                        cellSize={CELL_SIZE}
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
                        onDelete={() => {
                            removeComponents(
                                selectedComponents.map(
                                    (component) => component.id,
                                ),
                            );
                        }}
                    />
                </div>
            </MapViewport>

            <WorkspaceSidebarContainer showDecoration={!docsOpen}>
                {docsOpen ? (
                    <SidebarDocs onClose={closeDocs} />
                ) : (
                    <WorkspaceSidebar
                        topContent={
                            <WorkspaceIntroduction onOpenDocs={openDocs} />
                        }
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
                )}
            </WorkspaceSidebarContainer>

            <div
                className="layer-switcher"
                role="group"
                aria-label="Circuit layer"
            >
                <button
                    type="button"
                    className="layer-switcher__button"
                    aria-label="Select top layer"
                    aria-pressed={activeLayer === 0}
                    title="Top layer"
                    onClick={() => {
                        clearSelection();
                        setActiveLayer(0);
                    }}
                >
                    <ChevronUp aria-hidden="true" />
                </button>
                <span aria-live="polite">{activeLayer === 0 ? 1 : 0}</span>
                <button
                    type="button"
                    className="layer-switcher__button"
                    aria-label="Select bottom layer"
                    aria-pressed={activeLayer === 1}
                    title="Bottom layer"
                    onClick={() => {
                        clearSelection();
                        setActiveLayer(1);
                    }}
                >
                    <ChevronDown aria-hidden="true" />
                </button>
            </div>

            <ComponentPalette
                mode={mode}
                selectedTool={selectedTool}
                onToggleMode={toggleMode}
                onSelectComponent={selectComponent}
                onSelectEraser={selectEraser}
                onSelectAnnotation={selectAnnotation}
            />

            <HistoryActions
                undo={undo}
                redo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
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
