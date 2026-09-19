import type { CircuitLayout } from "../circuit/circuitLayout";
import type { CircuitAnnotation } from "./circuitAnnotation";

export interface CircuitProject {
    readonly circuit: CircuitLayout;
    readonly annotations: readonly CircuitAnnotation[];
}
