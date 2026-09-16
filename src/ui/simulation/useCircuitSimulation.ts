import { useCallback, useMemo, useState } from "react";

import type { Circuit } from "../../domain/circuit/circuit";
import type { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import type { SimulationAction } from "../../domain/circuit/simulation/simulationAction";
import {
    advanceSimulation,
    createSimulation,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";

interface SimulationResult {
    readonly simulation: Simulation | null;
    readonly error: string | null;
}

interface AdvancedSimulationResult {
    readonly baseSimulation: Simulation;
    readonly simulation: Simulation;
    readonly error: string | null;
}

interface CircuitSimulationController extends SimulationResult {
    dispatchAction(action: SimulationAction): void;
}

const INACTIVE_RESULT: SimulationResult = {
    simulation: null,
    error: null,
};

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown simulation error";
}

function startSimulation(
    circuit: Circuit,
    registry: ComponentRegistry,
): SimulationResult {
    try {
        return {
            simulation: createSimulation(circuit, registry),
            error: null,
        };
    } catch (error) {
        return {
            simulation: null,
            error: errorMessage(error),
        };
    }
}

export function useCircuitSimulation(
    circuit: Circuit,
    registry: ComponentRegistry,
    enabled: boolean,
): CircuitSimulationController {
    const baseResult = useMemo(
        () => (enabled ? startSimulation(circuit, registry) : INACTIVE_RESULT),
        [circuit, enabled, registry],
    );

    const [advancedResult, setAdvancedResult] =
        useState<AdvancedSimulationResult | null>(null);

    const result =
        enabled && advancedResult?.baseSimulation === baseResult.simulation
            ? advancedResult
            : baseResult;

    const dispatchAction = useCallback(
        (action: SimulationAction) => {
            if (!enabled) {
                return;
            }

            setAdvancedResult((currentResult) => {
                const baseSimulation = baseResult.simulation;

                if (!baseSimulation) {
                    return currentResult;
                }

                const startingSimulation =
                    currentResult?.baseSimulation === baseSimulation
                        ? currentResult.simulation
                        : baseSimulation;

                try {
                    return {
                        baseSimulation,
                        simulation: advanceSimulation(startingSimulation, [
                            action,
                        ]),
                        error: null,
                    };
                } catch (error) {
                    return {
                        baseSimulation,
                        simulation: startingSimulation,
                        error: errorMessage(error),
                    };
                }
            });
        },
        [baseResult.simulation, enabled],
    );

    return {
        simulation: result.simulation,
        error: result.error,
        dispatchAction,
    };
}
