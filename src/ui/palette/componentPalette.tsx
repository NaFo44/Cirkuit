import {
    BUILT_IN_COMPONENT_TYPES,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";
import { ComponentGlyph } from "../components/componentGlyph";
import type { EditorMode } from "../editor/editorMode";
import type { EditorTool } from "../editor/editorTool";
import { Eraser, MagicEdit, Play } from "pixelarticons/react";

interface ComponentPaletteProps {
    mode: EditorMode;
    selectedTool: EditorTool;
    onModeChange: (mode: EditorMode) => void;
    onSelectComponent: (componentType: BuiltInComponentType) => void;
    onSelectEraser: () => void;
}

const COMPONENT_LABELS: Record<BuiltInComponentType, string> = {
    wire: "Wire",
    source: "Source",
    light: "Light",
    switch: "Switch",
};

export function ComponentPalette({
    mode,
    selectedTool,
    onModeChange,
    onSelectComponent,
    onSelectEraser,
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
                        <Play width={25} height={25} aria-hidden="true" />
                    ) : (
                        <MagicEdit width={25} height={25} aria-hidden="true" />
                    )}
                </button>
                <span className="tooltiptext">
                    {modeLabel}
                </span>
            </div>

            {BUILT_IN_COMPONENT_TYPES.map((component) => (
                <div key={component} className="tooltip">
                    <button
                        type="button"
                        className="component-palette__item"
                        style={{
                            backgroundColor: `var(--cell-${component})`,
                        }}
                        aria-label={`${COMPONENT_LABELS[component]}`}
                        aria-pressed={
                            selectedTool.kind === "component" &&
                            selectedTool.componentType === component
                        }
                        onClick={() => onSelectComponent(component)}
                        disabled={mode === "simulate"}
                    >
                        <ComponentGlyph size={25} componentType={component} />
                    </button>
                    <span className="tooltiptext" aria-hidden="true">
                        {COMPONENT_LABELS[component]}
                    </span>
                </div>
            ))}
            <div className="tooltip">
                <button
                    type="button"
                    className="component-palette__item component-palette__item--eraser"
                    aria-label="Eraser"
                    aria-pressed={selectedTool.kind === "eraser"}
                    onClick={onSelectEraser}
                    disabled={mode === "simulate"}
                >
                    <Eraser width={25} height={25} aria-hidden="true" />
                </button>
                <span className="tooltiptext">
                    Eraser
                </span>
            </div>
        </aside>
    );
}
