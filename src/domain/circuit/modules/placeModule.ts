import type { CircuitLayout } from "../circuitLayout";
import type { CircuitLayer, Rotation } from "../placedComponent";
import type { Position } from "../../grid/position";
import {
    createModuleInstance,
    getModuleComponentType,
} from "./moduleDefinition";

export interface ModulePlacement {
    readonly moduleId: string;
    readonly position: Position;
    readonly rotation: Rotation;
    readonly layer: CircuitLayer;
}

export function canPlaceModule(
    circuit: CircuitLayout,
    placement: ModulePlacement,
): boolean {
    if (placement.moduleId.trim() === "") {
        return false;
    }

    const type = getModuleComponentType(placement.moduleId);

    return (
        circuit.registry.has(type) &&
        circuit.canPlaceComponents([
            {
                type,
                position: placement.position,
                rotation: placement.rotation,
                layer: placement.layer,
            },
        ])
    );
}

export function placeModule(
    circuit: CircuitLayout,
    placement: ModulePlacement,
    createId: () => string,
): CircuitLayout {
    if (!canPlaceModule(circuit, placement)) {
        return circuit;
    }

    return circuit.withComponent(
        createModuleInstance(placement.moduleId, {
            id: createId(),
            position: placement.position,
            rotation: placement.rotation,
            layer: placement.layer,
        }),
    );
}
