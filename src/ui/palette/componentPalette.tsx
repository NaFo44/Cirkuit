import { COMPONENT_TYPES, type ComponentType } from "../../domain/grid/cell";

interface ComponentPaletteProps {
    selectedComponent: ComponentType;
    onSelect: (component: ComponentType) => void;
}

const COMPONENT_LABELS: Record<ComponentType, string> = {
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
            {COMPONENT_TYPES.map((component) => (
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
