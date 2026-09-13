export type Direction = "north" | "east" | "south" | "west";

export type PortKind = "input" | "output" | "inout" | "passive";

export function portCanRead(kind: PortKind): boolean {
    return kind === "input" || kind === "inout";
}

export function portCanDrive(kind: PortKind): boolean {
    return kind === "output" || kind === "inout";
}

export interface PortDefinition {
    readonly id: string;
    readonly kind: PortKind;
    readonly side: Direction;
}
