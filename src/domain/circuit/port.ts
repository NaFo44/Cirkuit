import type { Direction } from "./direction";
import type { CircuitLayer } from "./placedComponent";

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

    // layer relative to the component's placement layer
    // 0 = same layer
    // 1 = opposite layer
    readonly layerOffset?: CircuitLayer;
}
