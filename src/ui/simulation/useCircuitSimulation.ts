import { useEffect, useCallback, useMemo, useState, useRef } from "react";

import type { Circuit } from "../../domain/circuit/circuit";
import type { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import type { SimulationAction } from "../../domain/circuit/simulation/simulationAction";
import {
    advanceSimulation,
    createSimulation,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";
import { SIMULATION_TICK_INTERVAL_MS } from "../../domain/circuit/simulation/simulationTiming";

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

    const pendingActionsRef = useRef<SimulationAction[]>([]);

    const advance = useCallback(
        (actions: readonly SimulationAction[]) => {
            setAdvancedResult((currentResult) => {
                const baseSimulation = baseResult.simulation;

                if (!enabled || !baseSimulation) {
                    return currentResult;
                }

                const matchingResult =
                    currentResult?.baseSimulation === baseSimulation
                        ? currentResult
                        : null;

                if (matchingResult?.error) {
                    return matchingResult;
                }

                const startingSimulation =
                    matchingResult?.simulation ?? baseSimulation;

                try {
                    return {
                        baseSimulation,
                        simulation: advanceSimulation(
                            startingSimulation,
                            actions,
                        ),
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

    useEffect(() => {
        pendingActionsRef.current = [];

        if (!enabled || !baseResult.simulation) {
            return;
        }

        const timer = window.setInterval(() => {
            const actions = pendingActionsRef.current;
            pendingActionsRef.current = [];

            advance(actions);
        }, SIMULATION_TICK_INTERVAL_MS);

        return () => {
            window.clearInterval(timer);
            pendingActionsRef.current = [];
        };
    }, [advance, baseResult.simulation, enabled]);

    const dispatchAction = useCallback(
        (action: SimulationAction) => {
            if (!enabled || !baseResult.simulation) {
                return;
            }

            pendingActionsRef.current.push(action);
        },
        [baseResult.simulation, enabled],
    );

    const result =
        enabled && advancedResult?.baseSimulation === baseResult.simulation
            ? advancedResult
            : baseResult;

    return {
        simulation: result.simulation,
        error: result.error,
        dispatchAction,
    };
}
