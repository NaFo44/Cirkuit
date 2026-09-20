import type { Position } from "../grid/position";

export const ROTATIONS = [0, 90, 180, 270] as const;

export type Rotation = (typeof ROTATIONS)[number];

export function isRotation(value: unknown): value is Rotation {
    return ROTATIONS.some((rotation) => rotation === value);
}

export function rotateClockwise(rotation: Rotation): Rotation {
    return ((rotation + 90) % 360) as Rotation;
}

export interface PlacedComponent {
    readonly id: string;
    readonly type: string;
    readonly position: Position;
    readonly rotation: Rotation;
}
