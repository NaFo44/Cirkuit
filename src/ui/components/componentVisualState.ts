import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/builtInComponents";
import { DIRECTIONS } from "../../domain/circuit/direction";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import { SIGNALS, type Signal } from "../../domain/circuit/signal";
import { resolveSignals } from "../../domain/circuit/simulation/resolveSignals";
import {
    getSimulationComponentState,
    getPortSignal,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";
import { isSwitchState } from "../../domain/circuit/components/switch";
import { CLOCK_OUTPUT_PORT_ID } from "../../domain/circuit/components/clock";

export type ComponentVisualState = "default" | "active" | Signal;

type ComponentVisualStateResolver = (
    component: PlacedComponent,
    simulation: Simulation,
) => ComponentVisualState;

function resolveDirectionalSignal(
    component: PlacedComponent,
    simulation: Simulation,
): Signal {
    return resolvePortSignals(component, simulation, DIRECTIONS);
}

function resolvePortSignals(
    component: PlacedComponent,
    simulation: Simulation,
    portIds: readonly string[],
): Signal {
    return resolveSignals(
        portIds.map((portId) =>
            getPortSignal(simulation, component.id, portId),
        ),
    );
}

const VIA_PORT_IDS = [
    ...DIRECTIONS,
    ...DIRECTIONS.map((direction) => `${direction}-other`),
];

const VISUAL_STATE_RESOLVERS = {
    wire: resolveDirectionalSignal,

    via: (component, simulation) =>
        resolvePortSignals(component, simulation, VIA_PORT_IDS),

    source: () => "default",

    clock: (component, simulation) =>
        resolvePortSignals(component, simulation, [CLOCK_OUTPUT_PORT_ID]),

    light: (component, simulation) => {
        const signal = resolveDirectionalSignal(component, simulation);

        if (signal === SIGNALS.conflict) {
            return "conflict";
        }

        if (signal === SIGNALS.high) {
            return "active";
        }

        return "default";
    },

    switch: (component, simulation) => {
        const state = getSimulationComponentState(simulation, component.id);

        return isSwitchState(state) && state.closed ? "active" : "default";
    },

    not: () => "default",

    and: () => "default",
} satisfies Record<BuiltInComponentType, ComponentVisualStateResolver>;

export function getComponentVisualState(
    component: PlacedComponent,
    simulation: Simulation,
): ComponentVisualState {
    if (!isBuiltInComponentType(component.type)) {
        return "default";
    }

    return VISUAL_STATE_RESOLVERS[component.type](component, simulation);
}

export function createComponentVisualStates(
    simulation: Simulation,
): ReadonlyMap<string, ComponentVisualState> {
    const visualStates = new Map<string, ComponentVisualState>();

    for (const component of simulation.circuit.components) {
        visualStates.set(
            component.id,
            getComponentVisualState(component, simulation),
        );
    }

    return visualStates;
}
