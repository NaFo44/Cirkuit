import { useEffect, useMemo, useState } from "react";

import { CircuitLayout } from "./domain/circuit/circuitLayout";
import {
    defaultComponentRegistry,
    type BuiltInComponentType,
} from "./domain/circuit/components/builtInComponents";
import { GRID_DIMENSIONS } from "./domain/grid/gridDimensions";
import type { Position } from "./domain/grid/position";
import {
    createComponentVisualStates,
    type ComponentVisualState,
} from "./ui/components/componentVisualState";
import { CircuitGrid } from "./ui/grid/circuitGrid";
import { ComponentPalette } from "./ui/palette/componentPalette";
import { useCircuitSimulation } from "./ui/simulation/useCircuitSimulation";
import { MapViewport } from "./ui/viewport/mapViewport";
import { applyEditorTool } from "./ui/editor/applyEditorTool";
import type { PlacedComponent } from "./domain/circuit/placedComponent";
import type { EditorMode } from "./ui/editor/editorMode";
import { rotateClockwise } from "./domain/circuit/placedComponent";
import { CELL_SIZE } from "./domain/grid/gridCoordinates";
import {
    getComponentHoverLabel,
    getComponentPresentation,
} from "./ui/components/componentPresentation";
import { ROTATE_COMPONENT_SHORTCUT } from "./ui/editor/editorShortcuts";
import { QuickStart } from "./ui/guide/quickStart";
import type {
    AnnotationType,
    CircuitAnnotation,
} from "./domain/project/circuitAnnotation";
import type { CircuitProject } from "./domain/project/circuitProject";
import { AnnotationLayer } from "./ui/annotations/annotationLayer";
import { isCircuitEditorTool, type EditorTool } from "./ui/editor/editorTool";

const EMPTY_COMPONENT_VISUAL_STATES: ReadonlyMap<string, ComponentVisualState> =
    new Map();

export function App() {
    const [mode, setMode] = useState<EditorMode>("edit");

    const [selectedTool, setSelectedTool] = useState<EditorTool>({
        kind: "component",
        componentType: "wire",
        rotation: 0,
    });

    const [project, setProject] = useState<CircuitProject>(() => ({
        circuit: CircuitLayout.empty(
            GRID_DIMENSIONS.width,
            GRID_DIMENSIONS.height,
        ),
        annotations: [],
    }));

    const { circuit, annotations } = project;

    const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(
        null,
    );

    const selectAnnotation = (annotationType: AnnotationType) => {
        setSelectedTool({
            kind: "annotation",
            annotationType,
        });
    };

    const hoveredComponent =
        hoveredComponentId === null
            ? undefined
            : circuit.getComponentById(hoveredComponentId);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                mode !== "edit" ||
                selectedTool.kind !== "component" ||
                !getComponentPresentation(selectedTool.componentType)
                    .rotatable ||
                event.repeat ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.key.toUpperCase() !== ROTATE_COMPONENT_SHORTCUT
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
        if (!isCircuitEditorTool(selectedTool)) {
            return;
        }

        const tool = selectedTool;

        setProject((currentProject) => {
            const nextCircuit = applyEditorTool(
                currentProject.circuit,
                tool,
                position,
            );

            if (nextCircuit === currentProject.circuit) {
                return currentProject;
            }

            return {
                ...currentProject,
                circuit: nextCircuit,
            };
        });
    };

    const addAnnotation = (annotation: CircuitAnnotation) => {
        setProject((currentProject) => ({
            ...currentProject,
            annotations: [...currentProject.annotations, annotation],
        }));
    };

    const updateAnnotation = (annotation: CircuitAnnotation) => {
        setProject((currentProject) => {
            const index = currentProject.annotations.findIndex(
                (currentAnnotation) => currentAnnotation.id === annotation.id,
            );

            if (index === -1) {
                return currentProject;
            }

            const nextAnnotations = [...currentProject.annotations];
            nextAnnotations[index] = annotation;

            return {
                ...currentProject,
                annotations: nextAnnotations,
            };
        });
    };

    const removeAnnotation = (annotationId: string) => {
        setProject((currentProject) => {
            const nextAnnotations = currentProject.annotations.filter(
                (annotation) => annotation.id !== annotationId,
            );

            if (nextAnnotations.length === currentProject.annotations.length) {
                return currentProject;
            }

            return {
                ...currentProject,
                annotations: nextAnnotations,
            };
        });
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

    const canvasWidth = circuit.width * CELL_SIZE;
    const canvasHeight = circuit.height * CELL_SIZE;

    const selectedAnnotationType =
        selectedTool.kind === "annotation" ? selectedTool.annotationType : null;

    const annotationLayerEditable =
        mode === "edit" && selectedAnnotationType !== null;

    return (
        <main className="circuit-editor">
            <MapViewport cellSize={CELL_SIZE}>
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

            <QuickStart />

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
