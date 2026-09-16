import type {
    ComponentDefinition,
    EvaluationContext,
} from "../componentDefinition";
import { DIRECTIONS } from "../direction";
import { SIGNALS, type Signal } from "../signal";
import { resolveSignals } from "../simulation/resolveSignals";

export interface SwitchState {
    readonly closed: boolean;
}

export function isSwitchState(state: unknown): state is SwitchState {
    return (
        typeof state === "object" &&
        state !== null &&
        "closed" in state &&
        typeof state.closed === "boolean"
    );
}

function requireSwitchState(state: unknown): SwitchState {
    if (!isSwitchState(state)) {
        throw new Error("Invalid switch state");
    }

    return state;
}

function computeClosedOutputs(
    context: EvaluationContext,
): ReadonlyMap<string, Signal> {
    return new Map(
        DIRECTIONS.map((outputSide) => {
            const incomingSignals = DIRECTIONS.filter(
                (inputSide) => inputSide !== outputSide,
            ).map(
                (inputSide) =>
                    context.inputs.get(inputSide) ?? SIGNALS.floating,
            );

            return [outputSide, resolveSignals(incomingSignals)] as const;
        }),
    );
}

export const switchDefinition = {
    type: "switch" as const,
    primaryAction: "toggle",

    ports: DIRECTIONS.map((side) => ({
        id: side,
        kind: "inout" as const,
        side,
    })),

    createInitialState: (): SwitchState => ({
        closed: false,
    }),

    computeOutputs: (context) => {
        const state = requireSwitchState(context.state);

        if (!state.closed) {
            return new Map(
                DIRECTIONS.map((side) => [side, SIGNALS.floating] as const),
            );
        }

        return computeClosedOutputs(context);
    },

    computeNextState: (context): SwitchState => {
        const state = requireSwitchState(context.state);

        const toggleCount = context.actions.filter(
            (action) => action.type === "toggle",
        ).length;

        if (toggleCount % 2 === 0) {
            return state;
        }

        return {
            closed: !state.closed,
        };
    },
} satisfies ComponentDefinition;
