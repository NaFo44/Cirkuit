import { useEffect, useState } from "react";

import type { EditorTool } from "./editorTool";
import { rotateClockwise } from "../../domain/circuit/placedComponent";
import type { BuiltInComponentType } from "../../domain/circuit/components/builtInComponents";
import type { AnnotationType } from "../../domain/project/circuitAnnotation";
import { getComponentPresentation } from "../components/componentPresentation";
import { ROTATE_COMPONENT_SHORTCUT } from "./editorShortcuts";
import type { EditorMode } from "./editorMode";

interface UseEditorToolSelectionOptions {
    readonly mode: EditorMode;
}

interface EditorToolSelection {
    readonly selectedTool: EditorTool;
    readonly selectedAnnotationType: AnnotationType | null;

    readonly selectComponent: (componentType: BuiltInComponentType) => void;

    readonly selectEraser: () => void;

    readonly selectAnnotation: (annotationType: AnnotationType) => void;

    readonly selectProbe: () => void;

    readonly selectModule: (moduleId: string) => void;
}

export function useEditorToolSelection(
    options: UseEditorToolSelectionOptions,
): EditorToolSelection {
    const [selectedTool, setSelectedTool] = useState<EditorTool>({
        kind: "component",
        componentType: "wire",
        rotation: 0,
    });

    const selectedAnnotationType =
        selectedTool.kind === "annotation" ? selectedTool.annotationType : null;

    const selectComponent = (componentType: BuiltInComponentType) => {
        setSelectedTool({
            kind: "component",
            componentType,
            rotation: 0,
        });
    };

    const selectModule = (moduleId: string) => {
        setSelectedTool({
            kind: "module",
            moduleId,
            rotation: 0,
        });
    };

    const selectEraser = () => {
        setSelectedTool({
            kind: "eraser",
        });
    };

    const selectAnnotation = (annotationType: AnnotationType) => {
        setSelectedTool({
            kind: "annotation",
            annotationType,
        });
    };

    const selectProbe = () => {
        setSelectedTool((currentTool) =>
            currentTool.kind === "probe"
                ? {
                      kind: "component",
                      componentType: "wire",
                      rotation: 0,
                  }
                : {
                      kind: "probe",
                  },
        );
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (options.mode !== "edit" || event.repeat) {
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

            if (event.key === "Escape" && selectedTool.kind === "module") {
                event.preventDefault();

                setSelectedTool({
                    kind: "component",
                    componentType: "wire",
                    rotation: 0,
                });

                return;
            }

            const rotatable =
                selectedTool.kind === "module" ||
                (selectedTool.kind === "component" &&
                    getComponentPresentation(selectedTool.componentType)
                        .rotatable);

            if (
                !rotatable ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.key.toUpperCase() !== ROTATE_COMPONENT_SHORTCUT
            ) {
                return;
            }

            event.preventDefault();

            setSelectedTool((currentTool) =>
                currentTool.kind === "component" ||
                currentTool.kind === "module"
                    ? {
                          ...currentTool,
                          rotation: rotateClockwise(currentTool.rotation),
                      }
                    : currentTool,
            );
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [options.mode, selectedTool]);

    return {
        selectedTool,
        selectedAnnotationType,
        selectComponent,
        selectModule,
        selectEraser,
        selectAnnotation,
        selectProbe,
    };
}
