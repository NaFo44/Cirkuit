import {
    BUILT_IN_COMPONENT_TYPES,
    type BuiltInComponentType,
} from "../../domain/circuit/components/builtInComponents";
import { ComponentGlyph } from "../components/componentGlyph";
import { getComponentPresentation } from "../components/componentPresentation";
import type { EditorMode } from "../editor/editorMode";
import type { EditorTool } from "../editor/editorTool";
import { Eraser, Pencil, Play } from "pixelarticons/react";
import { ROTATE_COMPONENT_SHORTCUT } from "../editor/editorShortcuts";
import type { AnnotationType } from "../../domain/project/circuitAnnotation";
import { AnnotationToolPicker } from "./annotationToolPicker";

interface ComponentPaletteProps {
    mode: EditorMode;
    selectedTool: EditorTool;
    onModeChange: (mode: EditorMode) => void;
    onSelectComponent: (componentType: BuiltInComponentType) => void;
    onSelectEraser: () => void;
    onSelectAnnotation: (annotationType: AnnotationType) => void;
}

export function ComponentPalette({
    mode,
    selectedTool,
    onModeChange,
    onSelectComponent,
    onSelectEraser,
    onSelectAnnotation,
}: ComponentPaletteProps) {
    const modeLabel = mode === "edit" ? "Run circuit" : "Edit circuit";
    return (
        <aside className="component-palette" aria-label="Component palette">
            <div className="tooltip">
                <button
                    type="button"
                    className="component-palette__item component-palette__item--mode"
                    aria-label={modeLabel}
                    aria-pressed={mode === "simulate"}
                    onClick={() =>
                        onModeChange(mode === "edit" ? "simulate" : "edit")
                    }
                >
                    {mode === "edit" ? (
                        <Play aria-hidden="true" />
                    ) : (
                        <Pencil aria-hidden="true" />
                    )}
                </button>
                <span className="tooltiptext">{modeLabel}</span>
            </div>

            <div className="component-palette__separator" aria-hidden="true" />

            {BUILT_IN_COMPONENT_TYPES.map((component) => {
                const presentation = getComponentPresentation(component);
                const tooltipLabel = presentation.rotatable
                    ? `${presentation.label} | ${ROTATE_COMPONENT_SHORTCUT} to rotate`
                    : presentation.label;

                return (
                    <div key={component} className="tooltip">
                        <button
                            type="button"
                            className="component-palette__item"
                            style={{
                                backgroundColor: presentation.paletteColor,
                            }}
                            aria-label={presentation.label}
                            aria-pressed={
                                selectedTool.kind === "component" &&
                                selectedTool.componentType === component
                            }
                            aria-keyshortcuts={
                                presentation.rotatable
                                    ? ROTATE_COMPONENT_SHORTCUT
                                    : undefined
                            }
                            onClick={() => onSelectComponent(component)}
                            disabled={mode === "simulate"}
                        >
                            <ComponentGlyph
                                componentType={component}
                                rotation={
                                    selectedTool.kind === "component" &&
                                    selectedTool.componentType === component
                                        ? selectedTool.rotation
                                        : 0
                                }
                            />
                        </button>
                        <span className="tooltiptext" aria-hidden="true">
                            {tooltipLabel}
                        </span>
                    </div>
                );
            })}
            <div className="tooltip">
                <button
                    type="button"
                    className="component-palette__item component-palette__item--eraser"
                    aria-label="Eraser"
                    aria-pressed={selectedTool.kind === "eraser"}
                    onClick={onSelectEraser}
                    disabled={mode === "simulate"}
                >
                    <Eraser aria-hidden="true" />
                </button>
                <span className="tooltiptext">Eraser</span>
            </div>

            <AnnotationToolPicker
                selectedType={
                    selectedTool.kind === "annotation"
                        ? selectedTool.annotationType
                        : null
                }
                disabled={mode === "simulate"}
                onSelect={onSelectAnnotation}
            />
        </aside>
    );
}
