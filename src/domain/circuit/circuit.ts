import type { PlacedComponent } from "./placedComponent";

export interface Circuit {
    readonly width: number;
    readonly height: number;
    readonly components: readonly PlacedComponent[];
}
