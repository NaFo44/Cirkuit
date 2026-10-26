import type { Circuit } from "../circuit";
import type { ComponentFootprint } from "../componentDefinition";
import type { PortReference } from "../netlist/netlist";
import {
    isCircuitLayer,
    isRotation,
    type PlacedComponent,
} from "../placedComponent";
import type { PortDefinition } from "../port";
import type { CircuitAnnotation } from "../../project/circuitAnnotation";

export const MODULE_TYPE_PREFIX = "module:";
export type ModuleComponentType = `module:${string}`;

export interface ModulePortDefinition extends PortDefinition {
    readonly name: string;
    readonly internalPort: PortReference;
    readonly layerOffset?: 0;
}

export interface ModuleDefinition {
    readonly id: string;
    readonly name: string;
    readonly footprint: ComponentFootprint;
    readonly ports: readonly ModulePortDefinition[];
    readonly circuit: Circuit;
    readonly annotations: readonly CircuitAnnotation[];
}

export interface ModuleInstance extends PlacedComponent {
    readonly type: ModuleComponentType;
}

export function getModuleComponentType(moduleId: string): ModuleComponentType {
    if (moduleId.trim() === "") {
        throw new Error("Module id cannot be empty");
    }

    return `module:${moduleId}`;
}

export function getModuleId(type: string): string | undefined {
    if (!type.startsWith(MODULE_TYPE_PREFIX)) {
        return undefined;
    }

    const id = type.slice(MODULE_TYPE_PREFIX.length);
    return id.trim() === "" ? undefined : id;
}

export function createModuleInstance(
    moduleId: string,
    placement: Omit<PlacedComponent, "type">,
): ModuleInstance {
    if (placement.id.trim() === "") {
        throw new Error("Module instance id cannot be empty");
    }

    if (
        !Number.isInteger(placement.position.x) ||
        !Number.isInteger(placement.position.y) ||
        !isRotation(placement.rotation) ||
        !isCircuitLayer(placement.layer)
    ) {
        throw new Error("Invalid module instance placement");
    }

    return {
        ...placement,
        type: getModuleComponentType(moduleId),
        position: { ...placement.position },
    };
}
