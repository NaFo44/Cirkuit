import type { ComponentDescriptor } from "../../domain/circuit/componentDefinition";
import {
    getComponentFootprint,
    resolvePortGeometry,
} from "../../domain/circuit/componentGeometry";
import { DIRECTION_OFFSETS } from "../../domain/circuit/direction";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import type { PortDefinition } from "../../domain/circuit/port";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";

export function getComponentRenderBounds(
    component: PlacedComponent,
    descriptor: ComponentDescriptor,
) {
    const footprint = getComponentFootprint(descriptor, component.rotation);

    return {
        left: component.position.x * CELL_SIZE,
        top: component.position.y * CELL_SIZE,
        width: footprint.width * CELL_SIZE,
        height: footprint.height * CELL_SIZE,
    };
}

export function getPortRenderPosition(
    component: PlacedComponent,
    descriptor: ComponentDescriptor,
    port: PortDefinition,
) {
    const { position, side, layer } = resolvePortGeometry(
        component,
        descriptor,
        port,
    );
    const direction = DIRECTION_OFFSETS[side];
    const offset = CELL_SIZE / 2 - 2;

    return {
        x: (position.x + 0.5) * CELL_SIZE + direction.x * offset,
        y: (position.y + 0.5) * CELL_SIZE + direction.y * offset,
        side,
        layer,
    };
}
