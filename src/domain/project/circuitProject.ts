import type { CircuitLayout } from "../circuit/circuitLayout";
import type { CircuitAnnotation } from "./circuitAnnotation";

export interface ProjectViewport {
    x: number;
    y: number;
    zoom: number;
}

export interface CircuitProject {
    readonly circuit: CircuitLayout;
    readonly annotations: readonly CircuitAnnotation[];
    viewport: ProjectViewport;
}
