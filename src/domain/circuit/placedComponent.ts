import type { Position } from "../grid/position";

export type Rotation = 0 | 90 | 180 | 270;

export interface PlacedComponent {
    readonly id: string;
    readonly type: string;
    readonly position: Position;
    readonly rotation: Rotation;
}
