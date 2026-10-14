import {
    BUILT_IN_COMPONENT_TYPES,
    type BuiltInComponentType,
} from "../../domain/circuit/components/builtInComponents";
import { ComponentGlyph } from "../components/componentGlyph";
import { getComponentPresentation } from "../components/componentPresentation";
import type { EditorMode } from "../editor/editorMode";
import type { EditorTool } from "../editor/editorTool";
import { Eraser, Pencil, Play } from "pixelarticons/react";
import {
    ROTATE_COMPONENT_SHORTCUT,
    TOGGLE_SIMULATION_SHORTCUT,
} from "../editor/editorShortcuts";
import type { AnnotationType } from "../../domain/project/circuitAnnotation";
import { AnnotationToolPicker } from "./annotationToolPicker";
import { useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "pixelarticons/react";

const ADVANCED_COMPONENT_TYPES = [
    "clock",
    "memory",
    "via",
] as const satisfies readonly BuiltInComponentType[];

const BASIC_COMPONENT_TYPES = BUILT_IN_COMPONENT_TYPES.filter(
    (component) =>
        component !== "clock" && component !== "memory" && component !== "via",
);

interface ComponentPaletteProps {
    mode: EditorMode;
    selectedTool: EditorTool;
    onToggleMode: () => void;
    onSelectComponent: (componentType: BuiltInComponentType) => void;
    onSelectEraser: () => void;
    onSelectAnnotation: (annotationType: AnnotationType) => void;
}

export function ComponentPalette({
    mode,
    selectedTool,
    onToggleMode,
    onSelectComponent,
    onSelectEraser,
    onSelectAnnotation,
}: ComponentPaletteProps) {
    const modeLabel = mode === "edit" ? "Run circuit" : "Edit circuit";
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const advancedPanelId = useId();

    const advancedLabel = isAdvancedOpen
        ? "Hide advanced components"
        : "Show advanced components";

    const renderComponent = (component: BuiltInComponentType) => {
        const presentation = getComponentPresentation(component);
        const isSelected =
            selectedTool.kind === "component" &&
            selectedTool.componentType === component;

        const tooltipLabel = presentation.rotatable
            ? `${presentation.label} | ${ROTATE_COMPONENT_SHORTCUT} to rotate`
            : presentation.label;

        return (
            <div key={component} className="tooltip">
                <button
                    type="button"
                    className="component-palette__item"
                    style={{ backgroundColor: presentation.paletteColor }}
                    aria-label={presentation.label}
                    aria-pressed={isSelected}
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
                            selectedTool.kind === "component" && isSelected
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
    };

    return (
        <aside
            className={`component-palette${
                isAdvancedOpen ? " component-palette--advanced-open" : ""
            }`}
            aria-label="Component palette"
        >
            <div
                id={advancedPanelId}
                className="component-palette__advanced-panel"
                role="group"
                aria-label="Advanced components"
                hidden={!isAdvancedOpen}
            >
                {ADVANCED_COMPONENT_TYPES.map(renderComponent)}
                <AnnotationToolPicker
                    selectedType={
                        selectedTool.kind === "annotation"
                            ? selectedTool.annotationType
                            : null
                    }
                    disabled={mode === "simulate"}
                    onSelect={onSelectAnnotation}
                />
            </div>

            <div className="component-palette__advanced-tab tooltip">
                <button
                    type="button"
                    className="component-palette__advanced-toggle"
                    aria-label={advancedLabel}
                    aria-controls={advancedPanelId}
                    aria-expanded={isAdvancedOpen}
                    onClick={() => setIsAdvancedOpen((open) => !open)}
                >
                    {isAdvancedOpen ? (
                        <ChevronRight aria-hidden="true" />
                    ) : (
                        <ChevronLeft aria-hidden="true" />
                    )}
                </button>

                <span className="tooltiptext" aria-hidden="true">
                    {advancedLabel}
                </span>
            </div>

            <div className="tooltip">
                <button
                    type="button"
                    className="component-palette__item component-palette__item--mode"
                    aria-label={modeLabel}
                    aria-pressed={mode === "simulate"}
                    aria-keyshortcuts={TOGGLE_SIMULATION_SHORTCUT}
                    onClick={onToggleMode}
                >
                    {mode === "edit" ? (
                        <Play aria-hidden="true" />
                    ) : (
                        <Pencil aria-hidden="true" />
                    )}
                </button>
                <span className="tooltiptext">
                    {modeLabel} | {TOGGLE_SIMULATION_SHORTCUT}
                </span>
            </div>

            <div className="component-palette__separator" aria-hidden="true" />

            {BASIC_COMPONENT_TYPES.map(renderComponent)}

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
        </aside>
    );
}
