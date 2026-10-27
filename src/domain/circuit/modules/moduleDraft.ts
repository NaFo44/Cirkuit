import type {
    ModuleDefinition,
    ModulePortDefinition,
} from "./moduleDefinition";
import type { ComponentFootprint } from "../componentDefinition";
import { CircuitLayout } from "../circuitLayout";
import type { CircuitProject } from "../../project/circuitProject";

export interface ModuleDraft {
    readonly id: string;
    readonly name: string;
    readonly footprint: ComponentFootprint;
    readonly ports: readonly ModulePortDefinition[];
}

export function createModuleDraftProject(): CircuitProject {
    return {
        circuit: CircuitLayout.empty(64, 48),
        modules: [],
        annotations: [],
        viewport: { x: 360, y: 120, zoom: 1 },
    };
}

export function suggestModuleDraftName(
    modules: readonly ModuleDefinition[],
): string {
    const existingNames = new Set(modules.map((module) => module.name));

    let index = 1;
    while (existingNames.has(`Module ${index}`)) {
        index++;
    }

    return `Module ${index}`;
}
