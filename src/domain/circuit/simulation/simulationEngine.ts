import type { Circuit } from "../circuit";
import type {
    ComponentDefinition,
    EvaluationContext,
} from "../componentDefinition";
import type { ComponentRegistry } from "../componentRegistry";
import { compileNetlist } from "../netlist/compileNetlist";
import { portKey, type Netlist } from "../netlist/netlist";
import { SIGNALS, type Signal } from "../signal";
import { resolveSignals } from "./resolveSignals";
import type { SimulationSnapshot } from "./simulationSnapshot";

export interface Simulation {
    readonly circuit: Circuit;
    readonly registry: ComponentRegistry;
    readonly netlist: Netlist;
    readonly snapshot: SimulationSnapshot;
}

function mapsAreEqual<K, V>(
    first: ReadonlyMap<K, V>,
    second: ReadonlyMap<K, V>,
): boolean {
    if (first.size !== second.size) {
        return false;
    }

    for (const [key, value] of first) {
        if (second.get(key) !== value) {
            return false;
        }
    }

    return true;
}

function createFloatingSignals(netlist: Netlist): ReadonlyMap<string, Signal> {
    return new Map(netlist.nets.map((net) => [net.id, SIGNALS.floating]));
}

function getComponentState(
    componentStates: ReadonlyMap<string, unknown>,
    componentId: string,
): unknown {
    if (!componentStates.has(componentId)) {
        throw new Error(`Missing state for component: ${componentId}`);
    }

    return componentStates.get(componentId);
}

function getComponentInputs(
    componentId: string,
    definition: ComponentDefinition,
    netlist: Netlist,
    netSignals: ReadonlyMap<string, Signal>,
): ReadonlyMap<string, Signal> {
    const inputs = new Map<string, Signal>();

    for (const port of definition.ports) {
        if (port.kind !== "input") {
            continue;
        }

        const key = portKey({
            componentId,
            portId: port.id,
        });
        const netId = netlist.netByPort.get(key);

        if (netId === undefined) {
            throw new Error(`Missing net for port: ${key}`);
        }

        const signal = netSignals.get(netId);

        if (signal === undefined) {
            throw new Error(`Missing signal for net: ${netId}`);
        }

        inputs.set(port.id, signal);
    }

    return inputs;
}

function isSignal(value: unknown): value is Signal {
    return Object.values(SIGNALS).some((signal) => signal === value);
}

function validateOutputs(
    componentId: string,
    definition: ComponentDefinition,
    outputs: ReadonlyMap<string, Signal>,
): void {
    for (const [portId, signal] of outputs) {
        const port = definition.ports.find(
            (candidate) => candidate.id === portId,
        );

        if (!port) {
            throw new Error(
                `Component "${componentId}" produced an unknown port: ${portId}`,
            );
        }

        if (port.kind !== "output") {
            throw new Error(
                `Component "${componentId}" produced a signal on non-output port: ${portId}`,
            );
        }

        if (!isSignal(signal)) {
            throw new Error(
                `Component "${componentId}" produced an invalid signal on port: ${portId}`,
            );
        }
    }
}

function evaluateNetSignals(
    circuit: Circuit,
    registry: ComponentRegistry,
    netlist: Netlist,
    componentStates: ReadonlyMap<string, unknown>,
    currentNetSignals: ReadonlyMap<string, Signal>,
    tick: number,
): ReadonlyMap<string, Signal> {
    const outputSignals = new Map<string, Signal>();

    for (const component of circuit.components) {
        const definition = registry.get(component.type);
        const context: EvaluationContext = {
            tick,
            inputs: getComponentInputs(
                component.id,
                definition,
                netlist,
                currentNetSignals,
            ),
            state: getComponentState(componentStates, component.id),
        };

        const outputs = definition.computeOutputs(context);

        validateOutputs(component.id, definition, outputs);

        for (const port of definition.ports) {
            if (port.kind !== "output") {
                continue;
            }

            outputSignals.set(
                portKey({
                    componentId: component.id,
                    portId: port.id,
                }),
                outputs.get(port.id) ?? SIGNALS.floating,
            );
        }
    }

    const nextNetSignals = new Map<string, Signal>();

    for (const net of netlist.nets) {
        const driverSignals = net.drivers.map(
            (driver) => outputSignals.get(portKey(driver)) ?? SIGNALS.floating,
        );

        nextNetSignals.set(net.id, resolveSignals(driverSignals));
    }

    return nextNetSignals;
}

function settleSignals(
    circuit: Circuit,
    registry: ComponentRegistry,
    netlist: Netlist,
    componentStates: ReadonlyMap<string, unknown>,
    tick: number,
): ReadonlyMap<string, Signal> {
    let currentSignals = createFloatingSignals(netlist);

    const maximumPasses = Math.max(
        16,
        2 * (circuit.components.length + netlist.nets.length),
    );

    for (let pass = 0; pass < maximumPasses; pass += 1) {
        const nextSignals = evaluateNetSignals(
            circuit,
            registry,
            netlist,
            componentStates,
            currentSignals,
            tick,
        );

        if (mapsAreEqual(currentSignals, nextSignals)) {
            return nextSignals;
        }

        currentSignals = nextSignals;
    }

    throw new Error(`Circuit did not stabilize at tick ${tick}`);
}

function createInitialStates(
    circuit: Circuit,
    registry: ComponentRegistry,
): ReadonlyMap<string, unknown> {
    return new Map(
        circuit.components.map((component) => [
            component.id,
            registry.get(component.type).createInitialState(),
        ]),
    );
}

function computeNextStates(
    simulation: Simulation,
): ReadonlyMap<string, unknown> {
    const { circuit, registry, netlist, snapshot } = simulation;

    if (snapshot.componentStates.size !== circuit.components.length) {
        throw new Error("Simulation state does not match the circuit");
    }

    const nextStates = new Map<string, unknown>();

    for (const component of circuit.components) {
        const definition = registry.get(component.type);
        const currentState = getComponentState(
            snapshot.componentStates,
            component.id,
        );

        if (!definition.computeNextState) {
            nextStates.set(component.id, currentState);
            continue;
        }

        const context: EvaluationContext = {
            tick: snapshot.tick,
            inputs: getComponentInputs(
                component.id,
                definition,
                netlist,
                snapshot.netSignals,
            ),
            state: currentState,
        };

        nextStates.set(component.id, definition.computeNextState(context));
    }

    return nextStates;
}

export function createSimulation(
    circuit: Circuit,
    registry: ComponentRegistry,
): Simulation {
    const netlist = compileNetlist(circuit, registry);
    const componentStates = createInitialStates(circuit, registry);
    const tick = 0;

    return {
        circuit,
        registry,
        netlist,
        snapshot: {
            tick,
            componentStates,
            netSignals: settleSignals(
                circuit,
                registry,
                netlist,
                componentStates,
                tick,
            ),
        },
    };
}

export function advanceSimulation(simulation: Simulation): Simulation {
    const componentStates = computeNextStates(simulation);
    const tick = simulation.snapshot.tick + 1;

    return {
        ...simulation,
        snapshot: {
            tick,
            componentStates,
            netSignals: settleSignals(
                simulation.circuit,
                simulation.registry,
                simulation.netlist,
                componentStates,
                tick,
            ),
        },
    };
}

export function getPortSignal(
    simulation: Simulation,
    componentId: string,
    portId: string,
): Signal {
    const key = portKey({
        componentId,
        portId,
    });
    const netId = simulation.netlist.netByPort.get(key);

    if (netId === undefined) {
        throw new Error(`Unknown port: ${key}`);
    }

    const signal = simulation.snapshot.netSignals.get(netId);

    if (signal === undefined) {
        throw new Error(`Missing signal for net: ${netId}`);
    }

    return signal;
}
