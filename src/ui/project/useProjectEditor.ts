import { useCallback, useState } from "react";

import type { CircuitProject } from "../../domain/project/circuitProject";
import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { CircuitEditorTool } from "../editor/editorTool";
import type { Position } from "../../domain/grid/position";
import { applyEditorTool } from "../editor/applyEditorTool";
import type { CircuitAnnotation } from "../../domain/project/circuitAnnotation";

interface ProjectEditor {
    readonly project: CircuitProject;
    readonly revision: number;

    readonly paintCell: (tool: CircuitEditorTool, position: Position) => void;

    readonly addAnnotation: (annotation: CircuitAnnotation) => void;

    readonly updateAnnotation: (annotation: CircuitAnnotation) => void;

    readonly removeAnnotation: (annotationId: string) => void;

    readonly replaceProject: (project: CircuitProject) => void;

    readonly updateCircuit: (circuit: CircuitLayout) => void;
}

export function useProjectEditor(
    createInitialProject: () => CircuitProject,
): ProjectEditor {
    const [projectRevision, setProjectRevision] = useState(0);

    const [project, setProject] =
        useState<CircuitProject>(createInitialProject);

    const paintCell = useCallback(
        (tool: CircuitEditorTool, position: Position) => {
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
        },
        [],
    );

    const addAnnotation = useCallback((annotation: CircuitAnnotation) => {
        setProject((currentProject) => ({
            ...currentProject,
            annotations: [...currentProject.annotations, annotation],
        }));
    }, []);

    const updateAnnotation = useCallback((annotation: CircuitAnnotation) => {
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
    }, []);

    const removeAnnotation = useCallback((annotationId: string) => {
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
    }, []);

    const replaceProject = useCallback((nextProject: CircuitProject) => {
        setProject(nextProject);
        setProjectRevision((revision) => revision + 1);
    }, []);

    const updateCircuit = useCallback((circuit: CircuitLayout) => {
        setProject((currentProject) => {
            if (currentProject.circuit === circuit) {
                return currentProject;
            }

            return {
                ...currentProject,
                circuit,
            };
        });
    }, []);

    return {
        project,
        revision: projectRevision,
        paintCell,
        addAnnotation,
        updateAnnotation,
        removeAnnotation,
        replaceProject,
        updateCircuit,
    };
}
