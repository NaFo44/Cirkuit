import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { WorkspaceSidebar } from "./ui/sidebar/workspaceSidebar";
import {
    WorkspaceIntroduction,
    WorkspaceLinks,
    WorkspaceModuleAction,
    WorkspaceNavigation,
} from "./ui/sidebar/workspaceSidebarSections";
import { AnnotationLayer } from "./ui/annotations/annotationLayer";
import { isCircuitEditorTool } from "./ui/editor/editorTool";
import { ProjectActions } from "./ui/project/projectActions";
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
import { SidebarShortcuts } from "./ui/sidebar/sidebarShortcuts";
import { ProbeLayer } from "./ui/probe/probeLayer";
import {
    getComponentFootprint,
    resolvePortGeometry,
} from "./domain/circuit/componentGeometry";
import {
    createModulePortSignals,
    EMPTY_MODULE_PORT_SIGNALS,
} from "./ui/components/modulePortSignals";
import { useModulePlacement } from "./ui/modules/useModulePlacement";
import { ModulePlacementPreview } from "./ui/modules/modulePlacementPreview";
import { SidebarModules } from "./ui/sidebar/sidebarModules";
import { useModuleDraftWorkspace } from "./ui/modules/useModuleDraftWorkspace";
import { SidebarModuleDraft } from "./ui/sidebar/sidebarModuleDraft";
import {
    ModulePortPicker,
    type ModulePortPickRequest,
} from "./ui/modules/modulePortPicker";
import { SidebarTutorial } from "./ui/sidebar/sidebarTutorial";

const EMPTY_COMPONENT_VISUAL_STATES: ReadonlyMap<string, ComponentVisualState> =
    new Map();

type SidebarView = "main" | "docs" | "tutorial" | "shortcuts" | "modules";

interface CircuitWorkspaceProps {
    readonly workspace: ReturnType<typeof useModuleDraftWorkspace>;
}

function CircuitWorkspace({ workspace }: CircuitWorkspaceProps) {
    const {
        editor,
        openDraft: onOpenDraft,
        openMain: onOpenMain,
        renameDraft: onRenameDraft,
        replaceProject: onProjectOpen,
    } = workspace;
    const draft = workspace.isDraft ? workspace.draft : null;
    const isDraft = draft !== null;
    const [mode, setMode] = useState<EditorMode>("edit");
    const [activeLayer, setActiveLayer] = useState<CircuitLayer>(0);
    const mapViewportRef = useRef<MapViewportHandle>(null);
    const [sidebarView, setSidebarView] = useState<SidebarView>(
        isDraft ? "main" : workspace.mainView,
    );
    const [pickRequest, setPickRequest] =
        useState<ModulePortPickRequest | null>(null);
    const [selectedDraftPortId, setSelectedDraftPortId] = useState<
        string | null
    >(null);
    const [configurationError, setConfigurationError] = useState<string | null>(
        null,
    );

    useEffect(() => {
        if (!pickRequest) return;
        const cancel = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setPickRequest(null);
                setConfigurationError(null);
            }
        };
        window.addEventListener("keydown", cancel);
        return () => window.removeEventListener("keydown", cancel);
    }, [pickRequest]);

    const toggleMode = useCallback(() => {
        setPickRequest(null);
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
        selectModule,
        selectEraser,
        selectAnnotation,
        selectProbe,
    } = useEditorToolSelection({
        mode,
        modules: editor.project.modules,
    });

    const isProbing = selectedTool.kind === "probe";

    const isPlacingModule = selectedTool.kind === "module";

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
    } = editor;

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
        enabled:
            mode === "edit" && !isProbing && !isPlacingModule && !pickRequest,
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

    const modulePlacement = useModulePlacement({
        circuit,
        modules: project.modules,
        tool: selectedTool.kind === "module" ? selectedTool : null,
        pointerPosition,
        layer: activeLayer,
        enabled: mode === "edit" && !isDraft,
        onCircuitChange: updateCircuit,
        onPlaced: clearSelection,
    });

    const endModuleDrag = modulePlacement.endDrag;

    const selectedDraftPort = draft?.ports.find(
        (port) => port.id === selectedDraftPortId,
    );
    const beginPortPick = (request: ModulePortPickRequest) => {
        clearSelection();
        selectComponent("wire");
        setConfigurationError(null);
        setPickRequest(request);
    };
    const selectDraftPort = (id: string) => {
        setSelectedDraftPortId(id);
        const reference = draft?.ports.find(
            (port) => port.id === id,
        )?.internalPort;
        const component =
            reference && circuit.getComponentById(reference.componentId);
        if (!component || !reference) return;
        const descriptor = circuit.registry.get(component.type);
        const port = descriptor.ports.find(
            (port) => port.id === reference.portId,
        );
        if (port)
            setActiveLayer(
                resolvePortGeometry(component, descriptor, port).layer,
            );
    };
    const pickInternalPort = (componentId: string) => {
        if (!pickRequest) return;
        if (pickRequest.type === "add") {
            const result = workspace.addPort(pickRequest.kind, componentId);
            setConfigurationError(result.error);
            if (result.error) return;
            setSelectedDraftPortId(result.portId);
        } else {
            const error = workspace.reconnectPort(
                pickRequest.portId,
                componentId,
            );
            setConfigurationError(error);
            if (error) return;
            setSelectedDraftPortId(pickRequest.portId);
        }
        setPickRequest(null);
    };

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
            selectComponent("wire");
            endModuleDrag();
            setMode("edit");
            setActiveLayer(0);
            setHoveredComponentId(null);
            resetSelectionState();
            onProjectOpen(importedProject);
        },
        [onProjectOpen, resetSelectionState, selectComponent, endModuleDrag],
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

    useSaveShortcut(() => {
        if (!isDraft) {
            saveProject();
        }
    });

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
        project.modules,
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
              project.modules,
          )
        : null;

    const modulePortSignals = useMemo(
        () =>
            simulation
                ? createModulePortSignals(simulation, project.modules)
                : EMPTY_MODULE_PORT_SIGNALS,
        [simulation, project.modules],
    );

    const isComponentInteractive = (component: PlacedComponent): boolean =>
        defaultComponentRegistry.has(component.type) &&
        defaultComponentRegistry.get(component.type).primaryAction !==
            undefined;

    const interactWithComponent = useCallback(
        (component: PlacedComponent) => {
            if (!defaultComponentRegistry.has(component.type)) {
                return;
            }

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
        setSidebarView("docs");
    }, []);

    const openTutorial = useCallback(() => {
        setSidebarView("tutorial");
    }, []);

    const openShortcuts = useCallback(() => {
        setSidebarView("shortcuts");
    }, []);

    const openModules = useCallback(() => {
        setSidebarView("modules");
    }, []);

    const openDraft = () => {
        endModuleDrag();
        onOpenDraft(getViewport() ?? project.viewport);
    };

    const returnToMain = () => {
        endModuleDrag();
        onOpenMain();
    };

    const closeSidebarPage = useCallback(() => {
        setSidebarView("main");
    }, []);

    const annotationLayerEditable =
        mode === "edit" && selectedAnnotationType !== null && !pickRequest;

    const selectionInteractionMode =
        mode !== "edit" || isProbing || isPlacingModule || pickRequest
            ? "disabled"
            : isSelectionModifierPressed
              ? "select"
              : selectedAnnotationType === null &&
                  selectedTool.kind !== "eraser"
                ? "move"
                : "disabled";

    const canPaint =
        mode === "edit" && isCircuitEditorTool(selectedTool) && !pickRequest;

    const erasedComponent =
        selectedTool.kind === "eraser" && pointerPosition
            ? circuit.getComponentAt(pointerPosition, activeLayer)
            : undefined;

    const previewPosition = erasedComponent?.position ?? pointerPosition;

    const previewFootprint = erasedComponent
        ? getComponentFootprint(
              circuit.registry.get(erasedComponent.type),
              erasedComponent.rotation,
          )
        : selectedTool.kind === "component"
          ? getComponentFootprint(
                circuit.registry.get(selectedTool.componentType),
                selectedTool.rotation,
            )
          : undefined;

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
                    className={
                        isPlacingModule
                            ? "circuit-canvas circuit-canvas--placing-module"
                            : "circuit-canvas"
                    }
                    style={{
                        width: canvasWidth,
                        height: canvasHeight,
                    }}
                    onPointerDownCapture={(event) => {
                        if (
                            isDraft &&
                            event.button === 0 &&
                            document.activeElement instanceof HTMLInputElement
                        ) {
                            document.activeElement.blur();
                        }
                        trackCanvasPointer(event);
                        modulePlacement.onPointerDownCapture(event);
                    }}
                    onPointerMoveCapture={trackCanvasPointer}
                    onPointerLeave={clearCanvasPointer}
                    onDragOver={modulePlacement.onDragOver}
                    onDragLeave={modulePlacement.onDragLeave}
                    onDrop={modulePlacement.onDrop}
                >
                    <CircuitGrid
                        circuit={circuit}
                        activeLayer={activeLayer}
                        selectedComponentIds={
                            mode === "edit" && !isProbing
                                ? selectedComponentIds
                                : undefined
                        }
                        componentVisualStates={componentVisualStates}
                        onPaintStart={canPaint ? handlePaintStart : undefined}
                        onCellPaint={canPaint ? paintCell : undefined}
                        onPaintEnd={canPaint ? handlePaintEnd : undefined}
                        onComponentInteract={
                            mode === "simulate" && simulation && !isProbing
                                ? interactWithComponent
                                : undefined
                        }
                        isComponentInteractive={isComponentInteractive}
                        onHoveredComponentChange={setHoveredComponentId}
                        registry={circuit.registry}
                        modules={project.modules}
                        modulePortSignals={modulePortSignals}
                    />

                    <CellPreview
                        position={
                            canPaint && selectedAnnotationType === null
                                ? previewPosition
                                : null
                        }
                        cellSize={CELL_SIZE}
                        footprint={previewFootprint}
                    />

                    {modulePlacement.preview && (
                        <ModulePlacementPreview {...modulePlacement.preview} />
                    )}

                    {isDraft &&
                        mode === "edit" &&
                        (pickRequest || selectedDraftPort) && (
                            <ModulePortPicker
                                circuit={circuit}
                                layer={activeLayer}
                                interactive={Boolean(pickRequest)}
                                selectedReference={
                                    selectedDraftPort?.internalPort
                                }
                                onPick={pickInternalPort}
                            />
                        )}

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

                    {!isProbing && (
                        <SelectionLayer
                            width={canvasWidth}
                            height={canvasHeight}
                            interactionMode={selectionInteractionMode}
                            selectedComponents={selectedComponents}
                            registry={circuit.registry}
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
                    )}

                    {isProbing && (
                        <ProbeLayer
                            key={projectRevision}
                            circuit={circuit}
                            activeLayer={activeLayer}
                            modules={project.modules}
                        />
                    )}
                </div>
            </MapViewport>

            <WorkspaceSidebarContainer
                showDecoration={sidebarView === "main" && !isDraft}
            >
                {sidebarView === "docs" && (
                    <SidebarDocs onClose={closeSidebarPage} />
                )}

                {sidebarView === "tutorial" && (
                    <SidebarTutorial onClose={closeSidebarPage} />
                )}

                {sidebarView === "shortcuts" && (
                    <SidebarShortcuts mode={mode} onClose={closeSidebarPage} />
                )}

                {sidebarView === "modules" && !isDraft && (
                    <SidebarModules
                        modules={project.modules}
                        selectedModuleId={
                            selectedTool.kind === "module"
                                ? selectedTool.moduleId
                                : null
                        }
                        disabled={mode !== "edit"}
                        onSelect={(id) => {
                            clearSelection();
                            selectModule(id);
                        }}
                        onDragStart={modulePlacement.startDrag}
                        onDragEnd={modulePlacement.endDrag}
                        onCreate={openDraft}
                        onEdit={(id) => {
                            endModuleDrag();
                            workspace.openModule(
                                id,
                                getViewport() ?? project.viewport,
                            );
                        }}
                        onClose={closeSidebarPage}
                    />
                )}

                {sidebarView === "main" &&
                    (isDraft ? (
                        <SidebarModuleDraft
                            draft={draft}
                            project={project}
                            disabled={mode !== "edit"}
                            isEditing={workspace.editingModuleId !== null}
                            actions={workspace}
                            selectedPortId={selectedDraftPortId}
                            pickRequest={pickRequest}
                            error={configurationError}
                            onError={setConfigurationError}
                            onSelectPort={selectDraftPort}
                            onPick={beginPortPick}
                            onCancelPick={() => {
                                setPickRequest(null);
                                setConfigurationError(null);
                            }}
                            onPublish={() =>
                                setConfigurationError(workspace.publishDraft())
                            }
                            onRename={onRenameDraft}
                            onReturn={returnToMain}
                        />
                    ) : (
                        <WorkspaceSidebar
                            topContent={<WorkspaceIntroduction />}
                            bottomContent={
                                <div className="workspace-actions">
                                    <WorkspaceModuleAction
                                        onOpenModules={openModules}
                                    />
                                    <ProjectActions
                                        error={projectFileError}
                                        onOpen={openProject}
                                        onSave={saveProject}
                                    />
                                </div>
                            }
                            footer={<WorkspaceLinks />}
                        >
                            <WorkspaceNavigation
                                onOpenDocs={openDocs}
                                onOpenTutorial={openTutorial}
                                onOpenShortcuts={openShortcuts}
                            />
                        </WorkspaceSidebar>
                    ))}
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
                onSelectComponent={(type) => {
                    setPickRequest(null);
                    selectComponent(type);
                }}
                onSelectEraser={() => {
                    setPickRequest(null);
                    selectEraser();
                }}
                onSelectAnnotation={(type) => {
                    setPickRequest(null);
                    selectAnnotation(type);
                }}
                onSelectProbe={() => {
                    setPickRequest(null);
                    selectProbe();
                }}
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

export function App() {
    const workspace = useModuleDraftWorkspace(createDefaultProject);
    const activeDraft = workspace.isDraft ? workspace.draft : null;

    return (
        <CircuitWorkspace
            key={activeDraft?.id ?? "main"}
            workspace={workspace}
        />
    );
}
