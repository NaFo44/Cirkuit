import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestModule } from "../../../test/moduleFixtures";
import type { Circuit } from "../circuit";
import type { ComponentDefinition } from "../componentDefinition";
import { ComponentRegistry } from "../componentRegistry";
import { createModuleInstance } from "../modules/moduleDefinition";
import { portKey, type Net, type PortReference } from "../netlist/netlist";
import type { PlacedComponent } from "../placedComponent";
import { SIGNALS, toLogicSignal, type Signal } from "../signal";
import {
    compileSimulation,
    type CompiledSimulation,
} from "./compileSimulation";
import {
    advanceSimulation,
    createSimulation,
    getModuleComponentId,
    getPortSignal,
    getSimulationComponentState,
} from "./simulationEngine";

vi.mock("./compileSimulation", () => ({ compileSimulation: vi.fn() }));

const compile = vi.mocked(compileSimulation);

function reference(componentId: string, portId: string): PortReference {
    return { componentId, portId };
}

function component(id: string, type: string): PlacedComponent {
    return { id, type, position: { x: 0, y: 0 }, rotation: 0, layer: 0 };
}

function net(
    id: string,
    ports: readonly PortReference[],
    drivers: readonly PortReference[] = [],
    readers: readonly PortReference[] = [],
): Net {
    return { id, ports, drivers, readers };
}

function graph(
    components: readonly PlacedComponent[],
    nets: readonly Net[],
    moduleComponents: CompiledSimulation["moduleComponents"] = new Map([
        ["module", new Map([["inner", "internal"]])],
    ]),
): CompiledSimulation {
    return {
        components,
        moduleComponents,
        netlist: {
            nets,
            netByPort: new Map(
                nets.flatMap((item) =>
                    item.ports.map((port) => [portKey(port), item.id] as const),
                ),
            ),
        },
    };
}

function driver(type: string, signal: Signal): ComponentDefinition {
    return {
        type,
        ports: [{ id: "output", kind: "output", side: "east" }],
        createInitialState: () => null,
        computeOutputs: () => new Map([["output", signal]]),
    };
}

const register: ComponentDefinition = {
    type: "register",
    ports: [
        { id: "input", kind: "input", side: "west" },
        { id: "output", kind: "output", side: "east" },
    ],
    createInitialState: () => ({ value: SIGNALS.low }),
    computeOutputs: ({ state }) =>
        new Map([["output", (state as { value: Signal }).value]]),
    computeNextState: ({ inputs, state, actions }) => ({
        value: actions.some((action) => action.type === "toggle")
            ? (state as { value: Signal }).value === SIGNALS.low
                ? SIGNALS.high
                : SIGNALS.low
            : toLogicSignal(inputs.get("input") ?? SIGNALS.floating),
    }),
};

const registry = new ComponentRegistry([
    register,
    driver("high", SIGNALS.high),
    driver("low", SIGNALS.low),
    {
        type: "clock",
        ports: [{ id: "output", kind: "output", side: "east" }],
        createInitialState: () => null,
        computeOutputs: ({ tick }) =>
            new Map([["output", tick % 2 === 0 ? SIGNALS.low : SIGNALS.high]]),
    },
]);

const visibleCircuit: Circuit = {
    width: 10,
    height: 10,
    components: [
        createModuleInstance("storage", {
            id: "module",
            position: { x: 1, y: 1 },
            rotation: 0,
            layer: 0,
        }),
    ],
};

function storageGraph(): CompiledSimulation {
    const source = reference("driver", "output");
    const input = reference("internal", "input");
    const output = reference("internal", "output");

    return graph(
        [component("driver", "high"), component("internal", "register")],
        [
            net(
                "data",
                [source, input, reference("module", "data")],
                [source],
                [input],
            ),
            net("result", [output, reference("module", "q")], [output]),
        ],
    );
}

beforeEach(() => {
    compile.mockReset();
});

describe("simulation engine with compiled module components", () => {
    it("passes definitions to compilation and keeps the visible circuit", () => {
        const compiled = storageGraph();
        const definitions = [createTestModule()];
        compile.mockReturnValue(compiled);

        const simulation = createSimulation(
            visibleCircuit,
            registry,
            definitions,
        );

        expect(compile).toHaveBeenCalledExactlyOnceWith(
            visibleCircuit,
            registry,
            definitions,
        );
        expect(simulation.circuit).toBe(visibleCircuit);
        expect(simulation.compiled).toBe(compiled);
        expect(simulation.netlist).toBe(compiled.netlist);
    });

    it("initializes only executable components, without advancing their states", () => {
        compile.mockReturnValue(storageGraph());

        const simulation = createSimulation(visibleCircuit, registry);

        expect([...simulation.snapshot.componentStates.keys()]).toEqual([
            "driver",
            "internal",
        ]);
        expect(getSimulationComponentState(simulation, "internal")).toEqual({
            value: SIGNALS.low,
        });
        expect(getPortSignal(simulation, "module", "data")).toBe(SIGNALS.high);
        expect(getPortSignal(simulation, "module", "q")).toBe(SIGNALS.low);
        expect(simulation.snapshot.tick).toBe(0);
    });

    it("uses compiled components on ticks without recompiling or mutating the previous state", () => {
        const compiled = storageGraph();
        compile.mockReturnValue(compiled);
        const original = createSimulation(visibleCircuit, registry);

        const updated = advanceSimulation(original);

        expect(compile).toHaveBeenCalledTimes(1);
        expect(updated.compiled).toBe(compiled);
        expect(updated.snapshot.tick).toBe(1);
        expect(getPortSignal(updated, "module", "q")).toBe(SIGNALS.high);
        expect(getPortSignal(original, "module", "q")).toBe(SIGNALS.low);
        expect(getSimulationComponentState(original, "internal")).toEqual({
            value: SIGNALS.low,
        });
    });

    it("updates all compiled states from the same previous snapshot", () => {
        const source = reference("driver", "output");
        const firstInput = reference("first", "input");
        const firstOutput = reference("first", "output");
        const secondInput = reference("second", "input");
        const secondOutput = reference("second", "output");
        compile.mockReturnValue(
            graph(
                [
                    component("driver", "high"),
                    component("first", "register"),
                    component("second", "register"),
                ],
                [
                    net("data", [source, firstInput], [source], [firstInput]),
                    net(
                        "link",
                        [firstOutput, secondInput],
                        [firstOutput],
                        [secondInput],
                    ),
                    net(
                        "result",
                        [secondOutput, reference("module", "q")],
                        [secondOutput],
                    ),
                ],
            ),
        );
        const original = createSimulation(visibleCircuit, registry);

        const firstTick = advanceSimulation(original);
        const secondTick = advanceSimulation(firstTick);

        expect(getSimulationComponentState(firstTick, "first")).toEqual({
            value: SIGNALS.high,
        });
        expect(getPortSignal(firstTick, "module", "q")).toBe(SIGNALS.low);
        expect(getPortSignal(secondTick, "module", "q")).toBe(SIGNALS.high);
    });

    it("targets internal actions without sharing state between components", () => {
        const firstInput = reference("first", "input");
        const firstOutput = reference("first", "output");
        const secondInput = reference("second", "input");
        const secondOutput = reference("second", "output");
        compile.mockReturnValue(
            graph(
                [
                    component("first", "register"),
                    component("second", "register"),
                ],
                [
                    net("first-input", [firstInput], [], [firstInput]),
                    net("first-output", [firstOutput], [firstOutput]),
                    net("second-input", [secondInput], [], [secondInput]),
                    net("second-output", [secondOutput], [secondOutput]),
                ],
                new Map([
                    ["one", new Map([["inner", "first"]])],
                    ["two", new Map([["inner", "second"]])],
                ]),
            ),
        );
        const original = createSimulation(visibleCircuit, registry);
        expect(getSimulationComponentState(original, "first")).not.toBe(
            getSimulationComponentState(original, "second"),
        );
        const target = getModuleComponentId(original, "one", "inner");

        const updated = advanceSimulation(original, [
            { componentId: target, type: "toggle" },
        ]);

        expect(getSimulationComponentState(updated, "first")).toEqual({
            value: SIGNALS.high,
        });
        expect(getSimulationComponentState(updated, "second")).toEqual({
            value: SIGNALS.low,
        });
    });

    it("rejects actions targeting a module box instead of an executable component", () => {
        compile.mockReturnValue(storageGraph());
        const simulation = createSimulation(visibleCircuit, registry);

        expect(() =>
            advanceSimulation(simulation, [
                { componentId: "module", type: "toggle" },
            ]),
        ).toThrow("Unknown simulation action target: module");
    });

    it.each([
        ["missing", "inner"],
        ["module", "missing"],
    ])(
        "rejects unknown internal references %s/%s",
        (instanceId, internalId) => {
            compile.mockReturnValue(storageGraph());
            const simulation = createSimulation(visibleCircuit, registry);

            expect(() =>
                getModuleComponentId(simulation, instanceId, internalId),
            ).toThrow(`Unknown module component: ${instanceId}/${internalId}`);
        },
    );

    it("evaluates internal clock outputs using the current global tick", () => {
        const output = reference("internal", "output");
        compile.mockReturnValue(
            graph(
                [component("internal", "clock")],
                [net("clock", [output, reference("module", "q")], [output])],
            ),
        );
        const initial = createSimulation(visibleCircuit, registry);
        const next = advanceSimulation(initial);
        const last = advanceSimulation(next);

        expect(getPortSignal(initial, "module", "q")).toBe(SIGNALS.low);
        expect(getPortSignal(next, "module", "q")).toBe(SIGNALS.high);
        expect(getPortSignal(last, "module", "q")).toBe(SIGNALS.low);
    });

    it("resolves conflicting executable drivers on an aliased module port", () => {
        const high = reference("high", "output");
        const low = reference("low", "output");
        compile.mockReturnValue(
            graph(
                [component("high", "high"), component("low", "low")],
                [
                    net(
                        "conflict",
                        [high, low, reference("module", "q")],
                        [high, low],
                    ),
                ],
            ),
        );

        const simulation = createSimulation(visibleCircuit, registry);

        expect(getPortSignal(simulation, "module", "q")).toBe(SIGNALS.conflict);
    });

    it("preserves a floating module port without executable drivers", () => {
        compile.mockReturnValue(
            graph([], [net("floating", [reference("module", "q")])]),
        );

        const simulation = createSimulation(visibleCircuit, registry);

        expect(getPortSignal(simulation, "module", "q")).toBe(SIGNALS.floating);
    });
});
