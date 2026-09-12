import {
    BUILT_IN_COMPONENT_TYPES,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";
import type { Rotation } from "../../domain/circuit/placedComponent";
import { ComponentGlyph } from "../components/componentGlyph";

interface ComponentPaletteProps {
    selectedComponent: BuiltInComponentType;
    selectedRotation: Rotation;
    onSelect: (component: BuiltInComponentType) => void;
}

const COMPONENT_LABELS: Record<BuiltInComponentType, string> = {
    wire: "Wire",
    source: "Source",
    light: "Light",
};

export function ComponentPalette({
    selectedComponent,
    selectedRotation,
    onSelect,
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
                    title={`${COMPONENT_LABELS[component]}, ${selectedRotation}°${selectedComponent === component && component !== "wire" ? " (click again to rotate)" : ""}`}
                    aria-label={`${COMPONENT_LABELS[component]}, ${selectedRotation} degrees`}
                    aria-pressed={selectedComponent === component}
                    onClick={() => onSelect(component)}
                >
                    <ComponentGlyph
                        size={25}
                        componentType={component}
                        rotation={selectedRotation}
                    />
                </button>
            ))}
        </aside>
    );
}
