import type { BuiltInComponentType } from "../../domain/circuit/components/componentType";
import type {
    PlacedComponent,
    Rotation,
} from "../../domain/circuit/placedComponent";
import type { Position } from "../../domain/grid/position";

export function createComponentId(): string {
    return crypto.randomUUID();
}

export function createPlacedComponent(
    componentType: BuiltInComponentType,
    position: Position,
    rotation: Rotation = 0,
): PlacedComponent {
    return {
        id: createComponentId(),
        type: componentType,
        position: {
            x: position.x,
            y: position.y,
        },
        rotation,
    };
}
