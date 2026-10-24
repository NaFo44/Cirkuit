import { getComponentFootprint } from "../../domain/circuit/componentGeometry";
import type { ComponentCatalog } from "../../domain/circuit/componentDefinition";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import type { CanvasPoint } from "../../domain/grid/canvasPoint";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";

export interface SelectionRectangle {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
}

export function createSelectionRectangle(
    start: CanvasPoint,
    end: CanvasPoint,
): SelectionRectangle {
    return {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        right: Math.max(start.x, end.x),
        bottom: Math.max(start.y, end.y),
    };
}

function rectangleIntersectsComponent(
    rectangle: SelectionRectangle,
    component: PlacedComponent,
    registry: ComponentCatalog,
): boolean {
    const { width, height } = getComponentFootprint(
        registry.get(component.type),
        component.rotation,
    );
    const left = component.position.x * CELL_SIZE;
    const top = component.position.y * CELL_SIZE;
    const right = left + width * CELL_SIZE;
    const bottom = top + height * CELL_SIZE;

    return (
        rectangle.left < right &&
        rectangle.right > left &&
        rectangle.top < bottom &&
        rectangle.bottom > top
    );
}

export function getComponentsInsideRectangle(
    components: readonly PlacedComponent[],
    rectangle: SelectionRectangle,
    registry: ComponentCatalog = defaultComponentRegistry,
): ReadonlySet<string> {
    return new Set(
        components
            .filter((component) =>
                rectangleIntersectsComponent(rectangle, component, registry),
            )
            .map((component) => component.id),
    );
}
