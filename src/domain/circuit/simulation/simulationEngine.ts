import type { Circuit } from "../circuit";
import type {
    ComponentDefinition,
    EvaluationContext,
} from "../componentDefinition";
import type { ComponentRegistry } from "../componentRegistry";
import {
    compileSimulation,
    type CompiledSimulation,
} from "./compileSimulation";
import type { ModuleDefinition } from "../modules/moduleDefinition";
import type { PlacedComponent } from "../placedComponent";
import { portKey, type Netlist } from "../netlist/netlist";
import { SIGNALS, type Signal } from "../signal";
import { resolveSignals } from "./resolveSignals";
import type { SimulationSnapshot } from "./simulationSnapshot";
import { portCanDrive, portCanRead } from "../port";
import type { SimulationAction } from "./simulationAction";

export interface Simulation {
    readonly circuit: Circuit;
    readonly registry: ComponentRegistry;
    readonly netlist: Netlist;
    readonly snapshot: SimulationSnapshot;
    readonly compiled: CompiledSimulation;
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

function resolveNetId(
    netlist: Netlist,
    componentId: string,
    portId: string,
): string {
    const key = portKey({ componentId, portId });
    const netId = netlist.netByPort.get(key);

    if (netId === undefined) {
        throw new Error(`Missing net for port: ${key}`);
    }

    return netId;
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
        if (!portCanRead(port.kind)) {
            continue;
        }

        const netId = resolveNetId(netlist, componentId, port.id);
        const signal = netSignals.get(netId);

        if (signal === undefined) {
            throw new Error(`Missing signal for net: ${netId}`);
        }

        inputs.set(port.id, signal);
    }

    return inputs;
}

const VALID_SIGNALS = new Set(Object.values(SIGNALS));

function isSignal(value: unknown): value is Signal {
    return VALID_SIGNALS.has(value as Signal);
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

        if (!portCanDrive(port.kind)) {
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
    components: readonly PlacedComponent[],
    registry: ComponentRegistry,
    netlist: Netlist,
    componentStates: ReadonlyMap<string, unknown>,
    currentNetSignals: ReadonlyMap<string, Signal>,
    tick: number,
): ReadonlyMap<string, Signal> {
    const outputSignals = new Map<string, Signal>();

    for (const component of components) {
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
            actions: [],
        };

        const outputs = definition.computeOutputs(context);

        validateOutputs(component.id, definition, outputs);

        for (const port of definition.ports) {
            if (!portCanDrive(port.kind)) {
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
    components: readonly PlacedComponent[],
    registry: ComponentRegistry,
    netlist: Netlist,
    componentStates: ReadonlyMap<string, unknown>,
    tick: number,
): ReadonlyMap<string, Signal> {
    let currentSignals = createFloatingSignals(netlist);

    const maximumPasses = Math.max(
        16,
        2 * (components.length + netlist.nets.length),
    );

    for (let pass = 0; pass < maximumPasses; pass += 1) {
        const nextSignals = evaluateNetSignals(
            components,
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
    components: readonly PlacedComponent[],
    registry: ComponentRegistry,
): ReadonlyMap<string, unknown> {
    return new Map(
        components.map((component) => [
            component.id,
            registry.get(component.type).createInitialState(),
        ]),
    );
}

function computeNextStates(
    simulation: Simulation,
    actions: readonly SimulationAction[],
): ReadonlyMap<string, unknown> {
    const { registry, netlist, snapshot } = simulation;
    const components = simulation.compiled.components;

    if (snapshot.componentStates.size !== components.length) {
        throw new Error("Simulation state does not match the circuit");
    }

    const componentIds = new Set(components.map((component) => component.id));

    const actionsByComponent = new Map<string, SimulationAction[]>();

    for (const action of actions) {
        if (action.type.trim() === "") {
            throw new Error("Simulation action type cannot be empty");
        }

        if (!componentIds.has(action.componentId)) {
            throw new Error(
                `Unknown simulation action target: ${action.componentId}`,
            );
        }

        const componentActions = actionsByComponent.get(action.componentId);

        if (componentActions) {
            componentActions.push(action);
        } else {
            actionsByComponent.set(action.componentId, [action]);
        }
    }

    const nextStates = new Map<string, unknown>();

    for (const component of components) {
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
            actions: actionsByComponent.get(component.id) ?? [],
        };

        nextStates.set(component.id, definition.computeNextState(context));
    }

    return nextStates;
}

export function createSimulation(
    circuit: Circuit,
    registry: ComponentRegistry,
    modules: readonly ModuleDefinition[] = [],
): Simulation {
    const compiled = compileSimulation(circuit, registry, modules);
    const netlist = compiled.netlist;
    const componentStates = createInitialStates(compiled.components, registry);
    const tick = 0;

    return {
        circuit,
        compiled,
        registry,
        netlist,
        snapshot: {
            tick,
            componentStates,
            netSignals: settleSignals(
                compiled.components,
                registry,
                netlist,
                componentStates,
                tick,
            ),
        },
    };
}

export function advanceSimulation(
    simulation: Simulation,
    actions: readonly SimulationAction[] = [],
): Simulation {
    const componentStates = computeNextStates(simulation, actions);
    const tick = simulation.snapshot.tick + 1;

    return {
        ...simulation,
        snapshot: {
            tick,
            componentStates,
            netSignals: settleSignals(
                simulation.compiled.components,
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
    const netId = resolveNetId(simulation.netlist, componentId, portId);
    const signal = simulation.snapshot.netSignals.get(netId);

    if (signal === undefined) {
        throw new Error(`Missing signal for net: ${netId}`);
    }

    return signal;
}

export function getSimulationComponentState(
    simulation: Simulation,
    componentId: string,
): unknown {
    return getComponentState(simulation.snapshot.componentStates, componentId);
}

export function getModuleComponentId(
    simulation: Simulation,
    instanceId: string,
    internalComponentId: string,
): string {
    const id = simulation.compiled.moduleComponents
        .get(instanceId)
        ?.get(internalComponentId);

    if (id === undefined) {
        throw new Error(
            `Unknown module component: ${instanceId}/${internalComponentId}`,
        );
    }

    return id;
}
