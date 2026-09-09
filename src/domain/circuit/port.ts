export type Direction = "north" | "east" | "south" | "west";

export type PortKind = "input" | "output" | "passive";

export interface PortDefinition {
    readonly id: string;
    readonly kind: PortKind;
    readonly side: Direction;
}