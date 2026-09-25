import { useCallback, useRef, useState } from "react";

import type { CircuitProject } from "../../domain/project/circuitProject";
import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { CircuitEditorTool } from "../editor/editorTool";
import type { Position } from "../../domain/grid/position";
import { applyEditorTool } from "../editor/applyEditorTool";
import type { CircuitAnnotation } from "../../domain/project/circuitAnnotation";
import {
    clearHistory,
    commitHistory,
    createHistory,
    redoHistory,
    undoHistory,
    type HistoryState,
} from "../../domain/circuit/history/history";

interface ProjectEditor {
    readonly project: CircuitProject;
    readonly revision: number;

    readonly beginPaint: () => void;

    readonly paintCell: (tool: CircuitEditorTool, position: Position) => void;

    readonly endPaint: () => void;

    readonly addAnnotation: (annotation: CircuitAnnotation) => void;

    readonly updateAnnotation: (annotation: CircuitAnnotation) => void;

    readonly removeAnnotation: (annotationId: string) => void;

    readonly replaceProject: (project: CircuitProject) => void;

    readonly updateCircuit: (circuit: CircuitLayout) => void;

    readonly canUndo: boolean;
    readonly canRedo: boolean;

    readonly undo: () => void;
    readonly redo: () => void;
}

interface ProjectEditorState {
    readonly project: CircuitProject;
    readonly history: HistoryState<CircuitProject>;
    readonly revision: number;
}

type ProjectUpdater = (project: CircuitProject) => CircuitProject;

export function useProjectEditor(
    createInitialProject: () => CircuitProject,
): ProjectEditor {
    const [state, setState] = useState<ProjectEditorState>(() => ({
        project: createInitialProject(),
        history: createHistory<CircuitProject>(),
        revision: 0,
    }));

    const paintStartRef = useRef<CircuitProject | null>(null);
    const isPaintingRef = useRef(false);

    const updateProject = useCallback((updater: ProjectUpdater): void => {
        setState((currentState) => {
            const nextProject = updater(currentState.project);

            if (nextProject === currentState.project) {
                return currentState;
            }

            return {
                ...currentState,
                project: nextProject,
                history: commitHistory(
                    currentState.history,
                    currentState.project,
                ),
            };
        });
    }, []);

    const beginPaint = useCallback(() => {
        isPaintingRef.current = true;
        paintStartRef.current = null;
    }, []);

    const paintCell = useCallback(
        (tool: CircuitEditorTool, position: Position) => {
            const updated: ProjectUpdater = (currentProject) => {
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
            };

            if (isPaintingRef.current) {
                setState((currentState) => {
                    if (paintStartRef.current === null) {
                        paintStartRef.current = currentState.project;
                    }

                    const nextProject = updated(currentState.project);

                    if (nextProject === currentState.project) {
                        return currentState;
                    }

                    return {
                        ...currentState,
                        project: nextProject,
                    };
                });

                return;
            }
        },
        [],
    );

    const endPaint = useCallback(() => {
        if (!isPaintingRef.current) {
            return;
        }

        isPaintingRef.current = false;

        const paintStart = paintStartRef.current;
        paintStartRef.current = null;

        if (paintStart === null) {
            return;
        }

        setState((currentState) => {
            if (currentState.project === paintStart) {
                return currentState;
            }

            return {
                ...currentState,
                history: commitHistory(currentState.history, paintStart),
            };
        });
    }, []);

    const addAnnotation = useCallback(
        (annotation: CircuitAnnotation) => {
            updateProject((currentProject) => ({
                ...currentProject,
                annotations: [...currentProject.annotations, annotation],
            }));
        },
        [updateProject],
    );

    const updateAnnotation = useCallback(
        (annotation: CircuitAnnotation) => {
            updateProject((currentProject) => {
                const index = currentProject.annotations.findIndex(
                    (currentAnnotation) =>
                        currentAnnotation.id === annotation.id,
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
        },
        [updateProject],
    );

    const removeAnnotation = useCallback(
        (annotationId: string) => {
            updateProject((currentProject) => {
                const nextAnnotations = currentProject.annotations.filter(
                    (annotation) => annotation.id !== annotationId,
                );

                if (
                    nextAnnotations.length === currentProject.annotations.length
                ) {
                    return currentProject;
                }

                return {
                    ...currentProject,
                    annotations: nextAnnotations,
                };
            });
        },
        [updateProject],
    );

    const replaceProject = useCallback((nextProject: CircuitProject) => {
        setState((currentState) => ({
            project: nextProject,
            history: clearHistory(),
            revision: currentState.revision + 1,
        }));
    }, []);

    const updateCircuit = useCallback(
        (circuit: CircuitLayout) => {
            updateProject((currentProject) => {
                if (currentProject.circuit === circuit) {
                    return currentProject;
                }

                return {
                    ...currentProject,
                    circuit,
                };
            });
        },
        [updateProject],
    );

    const undo = useCallback(() => {
        setState((currentState) => {
            const transition = undoHistory(
                currentState.history,
                currentState.project,
            );

            if (transition === undefined) {
                return currentState;
            }

            return {
                ...currentState,
                project: transition.current,
                history: transition.history,
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState((currentState) => {
            const transition = redoHistory(
                currentState.history,
                currentState.project,
            );

            if (transition === undefined) {
                return currentState;
            }

            return {
                ...currentState,
                project: transition.current,
                history: transition.history,
            };
        });
    }, []);

    return {
        project: state.project,
        revision: state.revision,

        beginPaint,
        paintCell,
        endPaint,

        addAnnotation,
        updateAnnotation,
        removeAnnotation,
        replaceProject,
        updateCircuit,

        canUndo: state.history.past.length > 0,
        canRedo: state.history.future.length > 0,

        undo,
        redo,
    };
}
