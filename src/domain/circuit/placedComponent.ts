import type { Position } from "../grid/position";

export const ROTATIONS = [0, 90, 180, 270] as const;

export type Rotation = (typeof ROTATIONS)[number];

export function isRotation(value: unknown): value is Rotation {
    return ROTATIONS.some((rotation) => rotation === value);
}

export function rotateClockwise(rotation: Rotation): Rotation {
    return ((rotation + 90) % 360) as Rotation;
}

export const CIRCUIT_LAYERS = [0, 1] as const;

export type CircuitLayer = (typeof CIRCUIT_LAYERS)[number];

export function isCircuitLayer(value: unknown): value is CircuitLayer {
    return CIRCUIT_LAYERS.some((layer) => layer === value);
}

export function oppositeLayer(layer: CircuitLayer): CircuitLayer {
    return layer === 0 ? 1 : 0;
}

export interface PlacedComponent {
    readonly id: string;
    readonly type: string;
    readonly position: Position;
    readonly rotation: Rotation;
    readonly layer: CircuitLayer;
}

export function getOccupiedLayers(
    component: Pick<PlacedComponent, "type" | "layer">,
): readonly CircuitLayer[] {
    return component.type === "via" ? CIRCUIT_LAYERS : [component.layer];
}
