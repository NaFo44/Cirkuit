import type { ModuleDefinition } from "../../domain/circuit/modules/moduleDefinition";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import { getComponentRenderBounds } from "../components/componentRenderGeometry";
import { ModuleSymbol } from "../components/moduleSymbol";
import "./modulePlacementPreview.css";

interface Props {
    readonly component: PlacedComponent;
    readonly definition: ModuleDefinition;
    readonly valid: boolean;
}

export function ModulePlacementPreview({
    component,
    definition,
    valid,
}: Props) {
    const bounds = getComponentRenderBounds(component, {
        type: component.type,
        footprint: definition.footprint,
        ports: definition.ports,
    });

    return (
        <div
            className="module-placement-preview"
            data-valid={valid}
            style={bounds}
            aria-hidden="true"
        >
            <ModuleSymbol
                component={component}
                definition={definition}
                inactive
            />
        </div>
    );
}
