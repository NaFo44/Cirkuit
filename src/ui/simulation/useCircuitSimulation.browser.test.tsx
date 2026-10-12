// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Circuit } from "../../domain/circuit/circuit";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import { isSwitchState } from "../../domain/circuit/components/switch";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import {
    getSimulationComponentState,
    type Simulation,
} from "../../domain/circuit/simulation/simulationEngine";
import { SIMULATION_TICK_INTERVAL_MS } from "../../domain/circuit/simulation/simulationTiming";
import { useCircuitSimulation } from "./useCircuitSimulation";

Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
});

interface SimulationProbeProps {
    readonly circuit: Circuit;
    readonly enabled?: boolean;
    readonly switchId?: string;
}

function getSwitchClosed(
    simulation: Simulation | null,
    switchId: string | undefined,
): boolean {
    if (!simulation || !switchId) {
        return false;
    }

    const state = getSimulationComponentState(simulation, switchId);

    return isSwitchState(state) && state.closed;
}

function SimulationProbe({
    circuit,
    enabled = true,
    switchId,
}: SimulationProbeProps) {
    const { simulation, dispatchAction } = useCircuitSimulation(
        circuit,
        defaultComponentRegistry,
        enabled,
    );

    return (
        <>
            <output
                data-tick={simulation?.snapshot.tick ?? "inactive"}
                data-switch-closed={getSwitchClosed(simulation, switchId)}
            />

            {switchId && (
                <button
                    type="button"
                    onClick={() => {
                        dispatchAction({
                            componentId: switchId,
                            type: "toggle",
                        });
                    }}
                >
                    Toggle
                </button>
            )}
        </>
    );
}

describe("useCircuitSimulation browser lifecycle", () => {
    let container: HTMLDivElement;
    let root: Root | null;

    beforeEach(() => {
        vi.useFakeTimers();

        container = document.createElement("div");
        document.body.append(container);

        root = createRoot(container);
    });

    afterEach(() => {
        if (root) {
            const mountedRoot = root;

            act(() => {
                mountedRoot.unmount();
            });

            root = null;
        }

        container?.remove();

        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it("advances the simulation at the configured interval", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [],
        };

        act(() => {
            root?.render(<SimulationProbe circuit={circuit} />);
        });

        const output = container.querySelector("output");

        expect(output?.getAttribute("data-tick")).toBe("0");

        act(() => {
            vi.advanceTimersByTime(SIMULATION_TICK_INTERVAL_MS);
        });

        expect(output?.getAttribute("data-tick")).toBe("1");

        act(() => {
            vi.advanceTimersByTime(SIMULATION_TICK_INTERVAL_MS * 4);
        });

        expect(output?.getAttribute("data-tick")).toBe("5");
    });

    it("queues component actions until the next simulation tick", () => {
        const switchComponent: PlacedComponent = {
            id: "switch-1",
            type: "switch",
            position: { x: 0, y: 0 },
            rotation: 0,
            layer: 0,
        };

        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [switchComponent],
        };

        act(() => {
            root?.render(
                <SimulationProbe
                    circuit={circuit}
                    switchId={switchComponent.id}
                />,
            );
        });

        const output = container.querySelector("output");
        const button = container.querySelector("button");

        expect(output?.getAttribute("data-tick")).toBe("0");
        expect(output?.getAttribute("data-switch-closed")).toBe("false");

        act(() => {
            button?.click();
        });

        expect(output?.getAttribute("data-tick")).toBe("0");
        expect(output?.getAttribute("data-switch-closed")).toBe("false");

        act(() => {
            vi.advanceTimersByTime(SIMULATION_TICK_INTERVAL_MS);
        });

        expect(output?.getAttribute("data-tick")).toBe("1");
        expect(output?.getAttribute("data-switch-closed")).toBe("true");
    });

    it("stops the timer when the hook is unmounted", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [],
        };

        act(() => {
            root?.render(<SimulationProbe circuit={circuit} />);
        });

        expect(vi.getTimerCount()).toBe(1);

        const mountedRoot = root;

        act(() => {
            mountedRoot?.unmount();
        });

        root = null;

        expect(vi.getTimerCount()).toBe(0);
    });

    it("does not start a timer when simulation is disabled", () => {
        const circuit: Circuit = {
            width: 1,
            height: 1,
            components: [],
        };

        act(() => {
            root?.render(<SimulationProbe circuit={circuit} enabled={false} />);
        });

        expect(vi.getTimerCount()).toBe(0);

        const output = container.querySelector("output");

        expect(output?.getAttribute("data-tick")).toBe("inactive");
    });
});
