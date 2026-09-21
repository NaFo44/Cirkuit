import { useState, useCallback } from "react";

import type { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import type { CircuitProject } from "../../domain/project/circuitProject";
import { downloadProjectFile, readProjectFile } from "./projectFile";

interface UseProjectFileActionsOptions {
    readonly project: CircuitProject;
    readonly registry: ComponentRegistry;

    readonly onProjectOpen: (project: CircuitProject) => void;
}

interface ProjectFileActions {
    readonly error: string | null;
    readonly openProject: (file: File) => Promise<void>;
    readonly saveProject: () => void;
}

function getProjectFileErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message !== "") {
        return error.message;
    }

    return "Could not process the project file.";
}

export function useProjectFileActions({
    project,
    registry,
    onProjectOpen,
}: UseProjectFileActionsOptions): ProjectFileActions {
    const [projectFileError, setProjectFileError] = useState<string | null>(
        null,
    );

    const saveProject = useCallback(() => {
        setProjectFileError(null);

        try {
            downloadProjectFile(project, registry);
        } catch (error) {
            setProjectFileError(getProjectFileErrorMessage(error));
        }
    }, [project, registry]);

    const openProject = useCallback(
        async (file: File) => {
            setProjectFileError(null);

            try {
                const importedProject = await readProjectFile(file, registry);

                const hasCurrentContent =
                    project.circuit.components.length > 0 ||
                    project.annotations.length > 0;

                if (
                    hasCurrentContent &&
                    !window.confirm(
                        "Replace the current circuit with the selected project?",
                    )
                ) {
                    return;
                }

                onProjectOpen(importedProject);
            } catch (error) {
                setProjectFileError(getProjectFileErrorMessage(error));
            }
        },
        [project, registry, onProjectOpen],
    );

    return {
        error: projectFileError,
        openProject,
        saveProject,
    };
}
