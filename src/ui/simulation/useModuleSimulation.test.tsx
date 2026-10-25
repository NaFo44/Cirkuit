// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    componentModule,
    modulePort,
    simulationCircuit,
} from "../../test/moduleSimulationFixtures";
import {
    createModuleInstance,
    type ModuleDefinition,
} from "../../domain/circuit/modules/moduleDefinition";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import { getPortSignal } from "../../domain/circuit/simulation/simulationEngine";
import { SIMULATION_TICK_INTERVAL_MS } from "../../domain/circuit/simulation/simulationTiming";
import { useCircuitSimulation } from "./useCircuitSimulation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const clock = componentModule("clock", [
    modulePort("q", "output", "east", "output"),
]);

const circuit = simulationCircuit([
    createModuleInstance("clock", {
        id: "m",
        position: { x: 2, y: 2 },
        rotation: 0,
        layer: 0,
    }),
]);

function Probe({ modules }: { modules: readonly ModuleDefinition[] }) {
    const { simulation, error } = useCircuitSimulation(
        circuit,
        defaultComponentRegistry,
        true,
        modules,
    );

    return (
        <output
            data-tick={simulation?.snapshot.tick ?? "inactive"}
            data-signal={simulation ? getPortSignal(simulation, "m", "q") : ""}
        >
            {error}
        </output>
    );
}

describe("module simulation hook", () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement("div");
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it("runs internal clocks using the shared simulation timer", () => {
        act(() => root.render(<Probe modules={[clock]} />));

        expect(container.querySelector("output")?.dataset.tick).toBe("0");
        expect(container.querySelector("output")?.dataset.signal).toBe("low");

        act(() => vi.advanceTimersByTime(5 * SIMULATION_TICK_INTERVAL_MS));

        expect(container.querySelector("output")?.dataset.tick).toBe("5");
        expect(container.querySelector("output")?.dataset.signal).toBe("high");
    });

    it("recompiles when definitions change without changing the parent circuit", () => {
        act(() => root.render(<Probe modules={[clock]} />));
        act(() => vi.advanceTimersByTime(5 * SIMULATION_TICK_INTERVAL_MS));

        expect(container.querySelector("output")?.dataset.tick).toBe("5");

        act(() =>
            root.render(
                <Probe modules={[{ ...clock, name: "Updated clock" }]} />,
            ),
        );

        expect(container.querySelector("output")?.dataset.tick).toBe("0");

        act(() => root.render(<Probe modules={[]} />));

        expect(container.querySelector("output")?.dataset.tick).toBe(
            "inactive",
        );
        expect(container.textContent).toContain("Unknown component type");

        act(() => vi.advanceTimersByTime(10 * SIMULATION_TICK_INTERVAL_MS));

        expect(container.querySelector("output")?.dataset.tick).toBe(
            "inactive",
        );
    });
});
