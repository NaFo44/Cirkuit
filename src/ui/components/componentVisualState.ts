import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";
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

export type ComponentVisualState = "default" | "active" | Signal;

type ComponentVisualStateResolver = (
    component: PlacedComponent,
    simulation: Simulation,
) => ComponentVisualState;

function resolveDirectionalSignal(
    component: PlacedComponent,
    simulation: Simulation,
): Signal {
    return resolveSignals(
        DIRECTIONS.map((portId) =>
            getPortSignal(simulation, component.id, portId),
        ),
    );
}

const VISUAL_STATE_RESOLVERS = {
    wire: resolveDirectionalSignal,

    source: () => "default",

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
