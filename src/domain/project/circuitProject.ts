import type { CircuitLayout } from "../circuit/circuitLayout";
import type { CircuitAnnotation } from "./circuitAnnotation";
import type { ModuleDefinition } from "../circuit/modules/moduleDefinition";

export interface ProjectViewport {
    x: number;
    y: number;
    zoom: number;
}

export interface CircuitProject {
    readonly circuit: CircuitLayout;
    readonly annotations: readonly CircuitAnnotation[];
    readonly modules: readonly ModuleDefinition[];
    viewport: ProjectViewport;
}
