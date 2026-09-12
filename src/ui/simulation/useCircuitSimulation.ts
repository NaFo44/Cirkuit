import { useMemo } from "react";

import type { Circuit } from "../../domain/circuit/circuit";
import type { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import { defaultComponentRegistry } from "../../domain/circuit/components/defaultComponentRegistry";
import {
    createSimulation,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";

export function useCircuitSimulation(
    circuit: Circuit,
    registry: ComponentRegistry = defaultComponentRegistry,
): Simulation {
    return useMemo(
        () => createSimulation(circuit, registry),
        [circuit, registry],
    );
}
