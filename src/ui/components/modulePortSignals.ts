import {
    getModuleId,
    type ModuleDefinition,
} from "../../domain/circuit/modules/moduleDefinition";
import { portKey } from "../../domain/circuit/netlist/netlist";
import type { Signal } from "../../domain/circuit/signal";
import {
    getPortSignal,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";

export const EMPTY_MODULE_PORT_SIGNALS: ReadonlyMap<string, Signal> = new Map();

export function getSignalLabel(signal: Signal): string {
    return signal.charAt(0).toUpperCase() + signal.slice(1);
}

export function createModulePortSignals(
    simulation: Simulation,
    modules: readonly ModuleDefinition[],
): ReadonlyMap<string, Signal> {
    const definitions = new Map(
        modules.map((definition) => [definition.id, definition]),
    );
    const signals = new Map<string, Signal>();

    for (const component of simulation.circuit.components) {
        const moduleId = getModuleId(component.type);

        if (moduleId === undefined) {
            continue;
        }

        const definition = definitions.get(moduleId);

        if (!definition) {
            throw new Error(`Unknown module: ${moduleId}`);
        }

        for (const port of definition.ports) {
            signals.set(
                portKey({ componentId: component.id, portId: port.id }),
                getPortSignal(simulation, component.id, port.id),
            );
        }
    }

    return signals;
}
