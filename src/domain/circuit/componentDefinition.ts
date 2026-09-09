import type { PortDefinition } from "./port";
import type { Signal } from "./signal";

export interface EvaluationContext {
    readonly tick: number;
    readonly inputs: ReadonlyMap<string, Signal>;
    readonly state: unknown;
}

export interface ComponentDefinition {
    readonly type: string;
    readonly ports: readonly PortDefinition[];

    readonly conductiveGroups?: readonly (readonly string[])[];

    createInitialState(): unknown;

    computeOutputs(context: EvaluationContext): ReadonlyMap<string, Signal>;

    computeNextState?(context: EvaluationContext): unknown;
}
