import {
    BUILT_IN_COMPONENT_TYPES,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";

interface ComponentPaletteProps {
    selectedComponent: BuiltInComponentType;
    onSelect: (component: BuiltInComponentType) => void;
}

const COMPONENT_LABELS: Record<BuiltInComponentType, string> = {
    wire: "Wire",
    source: "Source",
    light: "Light",
};

export function ComponentPalette({
    selectedComponent,
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
                    title={COMPONENT_LABELS[component]}
                    aria-label={COMPONENT_LABELS[component]}
                    aria-pressed={selectedComponent === component}
                    onClick={() => onSelect(component)}
                />
            ))}
        </aside>
    );
}
