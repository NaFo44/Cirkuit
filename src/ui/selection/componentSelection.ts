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
): boolean {
    const left = component.position.x * CELL_SIZE;
    const top = component.position.y * CELL_SIZE;
    const right = left + CELL_SIZE;
    const bottom = top + CELL_SIZE;

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
): ReadonlySet<string> {
    return new Set(
        components
            .filter((component) =>
                rectangleIntersectsComponent(rectangle, component),
            )
            .map((component) => component.id),
    );
}
