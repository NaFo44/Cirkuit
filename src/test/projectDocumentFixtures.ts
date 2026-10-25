import type { ProjectDocumentV3 } from "../domain/project/serialization/projectDocumentSchema";
import { createModuleInstance } from "../domain/circuit/modules/moduleDefinition";
import { createTestModule } from "./moduleFixtures";

export function createTestDocumentV3(): ProjectDocumentV3 {
    const definition = createTestModule();
    return {
        format: "cirkuit-project",
        version: 3,
        viewport: { x: 10, y: 20, zoom: 2 },
        circuit: {
            width: 12,
            height: 12,
            components: [
                createModuleInstance("inverter", {
                    id: "module-1",
                    position: { x: 2, y: 2 },
                    rotation: 90,
                    layer: 1,
                }),
            ],
        },
        modules: [
            {
                id: definition.id,
                name: definition.name,
                footprint: { ...definition.footprint },
                ports: definition.ports.map((port) => ({
                    ...port,
                    internalPort: { ...port.internalPort },
                })),
                circuit: {
                    width: definition.circuit.width,
                    height: definition.circuit.height,
                    components: definition.circuit.components.map(
                        (component) => ({
                            ...component,
                            position: { ...component.position },
                        }),
                    ),
                },
                annotations: { coordinateSpace: "grid", items: [] },
            },
        ],
        annotations: { coordinateSpace: "grid", items: [] },
    };
}
