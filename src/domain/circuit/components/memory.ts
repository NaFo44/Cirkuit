import type {
    ComponentDefinition,
    EvaluationContext,
} from "../componentDefinition";
import { SIGNALS, toLogicSignal, type LogicSignal } from "../signal";

export const MEMORY_DATA_PORT_ID = "data";
export const MEMORY_CLOCK_PORT_ID = "clock";
export const MEMORY_OUTPUT_PORT_ID = "output";

export interface MemoryState {
    readonly value: LogicSignal;
    readonly previousClock: LogicSignal;
}

function isMemoryState(state: unknown): state is MemoryState {
    return (
        typeof state === "object" &&
        state !== null &&
        "value" in state &&
        "previousClock" in state
    );
}

function requireMemoryState(state: unknown): MemoryState {
    if (!isMemoryState(state)) {
        throw new Error("Invalid memory state");
    }

    return state;
}

function computeNextMemoryState(context: EvaluationContext): MemoryState {
    const state = requireMemoryState(context.state);

    const data = toLogicSignal(
        context.inputs.get(MEMORY_DATA_PORT_ID) ?? SIGNALS.floating,
    );
    const clock = toLogicSignal(
        context.inputs.get(MEMORY_CLOCK_PORT_ID) ?? SIGNALS.floating,
    );

    const isRisingEdge =
        state.previousClock === SIGNALS.low && clock === SIGNALS.high;

    return {
        value: isRisingEdge ? data : state.value,
        previousClock: clock,
    };
}

export const memoryDefinition = {
    type: "memory" as const,

    ports: [
        {
            id: MEMORY_DATA_PORT_ID,
            kind: "input",
            side: "west",
        },
        {
            id: MEMORY_CLOCK_PORT_ID,
            kind: "input",
            side: "north",
        },
        {
            id: MEMORY_OUTPUT_PORT_ID,
            kind: "output",
            side: "east",
        },
    ],

    createInitialState: (): MemoryState => ({
        value: SIGNALS.low,
        previousClock: SIGNALS.low,
    }),

    computeOutputs: (context) => {
        const state = requireMemoryState(context.state);

        return new Map([[MEMORY_OUTPUT_PORT_ID, state.value]]);
    },

    computeNextState: computeNextMemoryState,
} satisfies ComponentDefinition;
