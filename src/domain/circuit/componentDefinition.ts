import type { PortDefinition } from "./port";
import type { Signal } from "./signal";

export interface ComponentAction {
    readonly type: string;
}

export interface EvaluationContext {
    readonly tick: number;
    readonly inputs: ReadonlyMap<string, Signal>;
    readonly state: unknown;
    readonly actions: readonly ComponentAction[];
}

export interface ComponentDefinition {
    readonly type: string;
    readonly ports: readonly PortDefinition[];

    readonly conductiveGroups?: readonly (readonly string[])[];
    readonly primaryAction?: string;

    createInitialState(): unknown;

    computeOutputs(context: EvaluationContext): ReadonlyMap<string, Signal>;

    computeNextState?(context: EvaluationContext): unknown;
}
