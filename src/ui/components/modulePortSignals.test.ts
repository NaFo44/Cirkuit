import { describe, expect, it } from "vitest";

import { createTestModule } from "../../test/moduleFixtures";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import { createModuleInstance } from "../../domain/circuit/modules/moduleDefinition";
import { portKey } from "../../domain/circuit/netlist/netlist";
import type { Simulation } from "../../domain/circuit/simulation/simulationEngine";
import { createModulePortSignals } from "./modulePortSignals";

describe("createModulePortSignals", () => {
    it("collects only public signals and distinguishes instances sharing port names", () => {
        const definition = createTestModule();
        const components = ["one", "two"].map((id, index) =>
            createModuleInstance(definition.id, {
                id,
                position: { x: index * 4, y: 0 },
                rotation: 0,
                layer: 0,
            }),
        );
        const keys = components.flatMap((component) =>
            definition.ports.map((port) =>
                portKey({ componentId: component.id, portId: port.id }),
            ),
        );
        const netlist = {
            nets: [],
            netByPort: new Map([
                ...keys.map((key, index) => [key, `net-${index}`] as const),
                [
                    portKey({ componentId: "internal", portId: "output" }),
                    "private",
                ],
            ]),
        };
        const simulation: Simulation = {
            circuit: { width: 12, height: 12, components },
            registry: defaultComponentRegistry,
            netlist,
            compiled: { components: [], netlist, moduleComponents: new Map() },
            snapshot: {
                tick: 0,
                componentStates: new Map(),
                netSignals: new Map([
                    ["net-0", "high"],
                    ["net-1", "low"],
                    ["net-2", "floating"],
                    ["net-3", "conflict"],
                    ["private", "high"],
                ]),
            },
        };
        expect(createModulePortSignals(simulation, [definition])).toEqual(
            new Map([
                [keys[0], "high"],
                [keys[1], "low"],
                [keys[2], "floating"],
                [keys[3], "conflict"],
            ]),
        );
        expect(() => createModulePortSignals(simulation, [])).toThrow(
            "Unknown module",
        );
    });
});
