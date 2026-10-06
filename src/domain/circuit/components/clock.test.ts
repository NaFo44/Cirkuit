import { describe, expect, it } from "vitest";

import type { Circuit } from "../circuit";
import { defaultComponentRegistry } from "./builtInComponents";
import type { PlacedComponent } from "../placedComponent";
import { SIGNALS } from "../signal";
import {
    advanceSimulation,
    createSimulation,
    getPortSignal,
} from "../simulation/simulationEngine";
import { CLOCK_OUTPUT_PORT_ID } from "./clock";

const clock: PlacedComponent = {
    id: "clock-1",
    type: "clock",
    position: { x: 0, y: 0 },
    rotation: 0,
    layer: 0,
};

const circuit: Circuit = {
    width: 1,
    height: 1,
    components: [clock],
};

describe("clockDefinition", () => {
    it("produces a 1 Hz square signal at 10 simulation ticks per second", () => {
        const expectedSignals = [
            SIGNALS.low,
            SIGNALS.low,
            SIGNALS.low,
            SIGNALS.low,
            SIGNALS.low,
            SIGNALS.high,
            SIGNALS.high,
            SIGNALS.high,
            SIGNALS.high,
            SIGNALS.high,
        ];

        let simulation = createSimulation(circuit, defaultComponentRegistry);

        for (const expectedSignal of expectedSignals) {
            expect(
                getPortSignal(simulation, clock.id, CLOCK_OUTPUT_PORT_ID),
            ).toBe(expectedSignal);

            simulation = advanceSimulation(simulation);
        }
    });
});
