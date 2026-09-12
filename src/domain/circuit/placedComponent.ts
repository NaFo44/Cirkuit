import type { Position } from "../grid/position";

export type Rotation = 0 | 90 | 180 | 270;

export function rotateClockwise(rotation: Rotation): Rotation {
    return ((rotation + 90) % 360) as Rotation;
}

export interface PlacedComponent {
    readonly id: string;
    readonly type: string;
    readonly position: Position;
    readonly rotation: Rotation;
}
