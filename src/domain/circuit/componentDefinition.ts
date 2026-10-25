import type { PortDefinition } from "./port";
import type { Signal } from "./signal";

export interface ComponentAction {
    readonly type: string;
}

export interface ComponentFootprint {
    readonly width: number;
    readonly height: number;
}

export interface EvaluationContext {
    readonly tick: number;
    readonly inputs: ReadonlyMap<string, Signal>;
    readonly state: unknown;
    readonly actions: readonly ComponentAction[];
}

export interface ComponentDescriptor {
    readonly type: string;
    readonly footprint?: ComponentFootprint;
    readonly ports: readonly PortDefinition[];
    readonly conductiveGroups?: readonly (readonly string[])[];
}

export interface ComponentCatalog {
    has(type: string): boolean;
    get(type: string): ComponentDescriptor;
}

export interface ComponentDefinition extends ComponentDescriptor {
    readonly primaryAction?: string;

    createInitialState(): unknown;

    computeOutputs(context: EvaluationContext): ReadonlyMap<string, Signal>;

    computeNextState?(context: EvaluationContext): unknown;
}
