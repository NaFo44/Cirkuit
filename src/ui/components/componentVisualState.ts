import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import { SIGNALS } from "../../domain/circuit/signal";
import {
    getPortSignal,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";

export type ComponentVisualState = "default" | "active" | "conflict";

type ComponentVisualStateResolver = (
    component: PlacedComponent,
    simulation: Simulation,
) => ComponentVisualState;

const VISUAL_STATE_RESOLVERS = {
    wire: () => "default",

    source: () => "default",

    light: (component, simulation) => {
        const signal = getPortSignal(simulation, component.id, "input");

        if (signal === SIGNALS.conflict) {
            return "conflict";
        }

        if (signal === SIGNALS.high) {
            return "active";
        }

        return "default";
    },
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
