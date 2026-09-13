import {
    BUILT_IN_COMPONENT_TYPES,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";
import { ComponentGlyph } from "../components/componentGlyph";
import type { EditorTool } from "../editor/editorTool";
import { Eraser } from "lucide-react";

interface ComponentPaletteProps {
    selectedTool: EditorTool;
    onSelectComponent: (componentType: BuiltInComponentType) => void;
    onSelectEraser: () => void;
}

const COMPONENT_LABELS: Record<BuiltInComponentType, string> = {
    wire: "Wire",
    source: "Source",
    light: "Light",
};

export function ComponentPalette({
    selectedTool,
    onSelectComponent,
    onSelectEraser,
}: ComponentPaletteProps) {
    return (
        <aside className="component-palette" aria-label="Component palette">
            {BUILT_IN_COMPONENT_TYPES.map((component) => (
                <button
                    key={component}
                    type="button"
                    className="component-palette__item"
                    style={{
                        backgroundColor: `var(--cell-${component})`,
                    }}
                    title={`${COMPONENT_LABELS[component]}`}
                    aria-label={`${COMPONENT_LABELS[component]}`}
                    aria-pressed={
                        selectedTool.kind === "component" &&
                        selectedTool.componentType === component
                    }
                    onClick={() => onSelectComponent(component)}
                >
                    <ComponentGlyph size={25} componentType={component} />
                </button>
            ))}
            <button
                type="button"
                className="component-palette__item component-palette__item--eraser"
                title="Eraser"
                aria-label="Eraser"
                aria-pressed={selectedTool.kind === "eraser"}
                onClick={onSelectEraser}
            >
                <Eraser size={25} aria-hidden="true" />
            </button>
        </aside>
    );
}
