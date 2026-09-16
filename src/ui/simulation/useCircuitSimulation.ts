import { useCallback, useMemo, useState } from "react";

import type { Circuit } from "../../domain/circuit/circuit";
import type { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import type { SimulationAction } from "../../domain/circuit/simulation/simulationAction";
import {
    advanceSimulation,
    createSimulation,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";

interface CircuitSimulationController {
    readonly simulation: Simulation;
    dispatchAction(action: SimulationAction): void;
}

export function useCircuitSimulation(
    circuit: Circuit,
    registry: ComponentRegistry,
): CircuitSimulationController {
    const baseSimulation = useMemo(
        () => createSimulation(circuit, registry),
        [circuit, registry],
    );

    const [advancedSimulation, setAdvancedSimulation] =
        useState<Simulation | null>(null);

    const simulation =
        advancedSimulation?.circuit === circuit &&
        advancedSimulation.registry === registry
            ? advancedSimulation
            : baseSimulation;

    const dispatchAction = useCallback(
        (action: SimulationAction) => {
            setAdvancedSimulation((currentSimulation) => {
                const startingSimulation =
                    currentSimulation?.circuit === circuit &&
                    currentSimulation.registry === registry
                        ? currentSimulation
                        : baseSimulation;

                return advanceSimulation(startingSimulation, [action]);
            });
        },
        [baseSimulation, circuit, registry],
    );

    return {
        simulation,
        dispatchAction,
    };
}
