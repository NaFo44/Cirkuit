import type { ComponentDefinition } from "../componentDefinition";
import { SIGNALS } from "../signal";
import { SIMULATION_TICKS_PER_SECOND } from "../simulation/simulationTiming";

export const CLOCK_OUTPUT_PORT_ID = "output";

const CLOCK_HALF_PERIOD_TICKS = SIMULATION_TICKS_PER_SECOND / 2;

export const clockDefinition = {
    type: "clock" as const,

    ports: [
        {
            id: CLOCK_OUTPUT_PORT_ID,
            kind: "output",
            side: "east",
        },
    ],

    createInitialState: () => null,

    computeOutputs: ({ tick }) => {
        const phase = Math.floor(tick / CLOCK_HALF_PERIOD_TICKS);
        const signal = phase % 2 === 0 ? SIGNALS.low : SIGNALS.high;

        return new Map([[CLOCK_OUTPUT_PORT_ID, signal]]);
    },
} satisfies ComponentDefinition;
