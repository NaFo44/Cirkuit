import { CircuitLayout } from "../domain/circuit/circuitLayout";
import type { ModuleDefinition } from "../domain/circuit/modules/moduleDefinition";
import type { CircuitProject } from "../domain/project/circuitProject";

export function createTestModule(
    overrides: Partial<ModuleDefinition> = {},
): ModuleDefinition {
    return {
        id: "inverter",
        name: "Inverter",
        footprint: { width: 3, height: 3 },
        ports: [
            {
                id: "a",
                name: "A",
                kind: "input",
                side: "west",
                offset: 1,
                internalPort: { componentId: "not-1", portId: "input" },
            },
            {
                id: "q",
                name: "Q",
                kind: "output",
                side: "east",
                offset: 1,
                internalPort: { componentId: "not-1", portId: "output" },
            },
        ],
        circuit: {
            width: 4,
            height: 4,
            components: [
                {
                    id: "not-1",
                    type: "not",
                    position: { x: 1, y: 1 },
                    rotation: 0,
                    layer: 0,
                },
            ],
        },
        annotations: [],
        ...overrides,
    };
}

export function createTestProject(): CircuitProject {
    return {
        circuit: CircuitLayout.empty(12, 12),
        modules: [],
        annotations: [],
        viewport: { x: 0, y: 0, zoom: 1 },
    };
}
