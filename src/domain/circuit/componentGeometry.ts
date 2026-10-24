import type { Position } from "../grid/position";
import type {
    ComponentDefinition,
    ComponentFootprint,
} from "./componentDefinition";
import { rotateDirection, type Direction } from "./direction";
import {
    getOccupiedLayers,
    oppositeLayer,
    type CircuitLayer,
    type ComponentPlacement,
    type PlacedComponent,
    type Rotation,
} from "./placedComponent";
import type { PortDefinition } from "./port";

export interface OccupiedCell {
    readonly position: Position;
    readonly layer: CircuitLayer;
}

export interface PortGeometry {
    readonly position: Position;
    readonly side: Direction;
    readonly layer: CircuitLayer;
}

export function getComponentFootprint(
    definition: ComponentDefinition,
    rotation: Rotation = 0,
): ComponentFootprint {
    const footprint = definition.footprint ?? { width: 1, height: 1 };

    return rotation === 90 || rotation === 270
        ? { width: footprint.height, height: footprint.width }
        : footprint;
}

export function rotateLocalPosition(
    position: Position,
    footprint: ComponentFootprint,
    rotation: Rotation,
): Position {
    switch (rotation) {
        case 0:
            return { x: position.x, y: position.y };
        case 90:
            return { x: footprint.height - 1 - position.y, y: position.x };
        case 180:
            return {
                x: footprint.width - 1 - position.x,
                y: footprint.height - 1 - position.y,
            };
        case 270:
            return { x: position.y, y: footprint.width - 1 - position.x };
    }
}

export function getLocalPortPosition(
    definition: ComponentDefinition,
    port: PortDefinition,
): Position {
    const { width, height } = getComponentFootprint(definition);
    const offset = port.offset ?? 0;

    switch (port.side) {
        case "north":
            return { x: offset, y: 0 };
        case "east":
            return { x: width - 1, y: offset };
        case "south":
            return { x: offset, y: height - 1 };
        case "west":
            return { x: 0, y: offset };
    }
}

export function resolvePortGeometry(
    component: PlacedComponent,
    definition: ComponentDefinition,
    port: PortDefinition,
): PortGeometry {
    const localPosition = rotateLocalPosition(
        getLocalPortPosition(definition, port),
        getComponentFootprint(definition),
        component.rotation,
    );

    return {
        position: {
            x: component.position.x + localPosition.x,
            y: component.position.y + localPosition.y,
        },
        side: rotateDirection(port.side, component.rotation),
        layer:
            port.layerOffset === 1
                ? oppositeLayer(component.layer)
                : component.layer,
    };
}

export function getOccupiedCells(
    component: ComponentPlacement,
    definition: ComponentDefinition,
): readonly OccupiedCell[] {
    const { width, height } = getComponentFootprint(
        definition,
        component.rotation,
    );
    const cells: OccupiedCell[] = [];

    for (const layer of getOccupiedLayers(component)) {
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                cells.push({
                    position: {
                        x: component.position.x + x,
                        y: component.position.y + y,
                    },
                    layer,
                });
            }
        }
    }

    return cells;
}
