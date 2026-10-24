import type { Position } from "../grid/position";
import { CircuitLayout } from "./circuitLayout";

export function canMoveComponents(
    circuit: CircuitLayout,
    componentIds: ReadonlySet<string>,
    offset: Position,
): boolean {
    const selectedComponents = circuit.components.filter((component) =>
        componentIds.has(component.id),
    );

    if (selectedComponents.length === 0) {
        return false;
    }

    return circuit.canPlaceComponents(
        selectedComponents.map((component) => ({
            ...component,
            position: {
                x: component.position.x + offset.x,
                y: component.position.y + offset.y,
            },
        })),
        componentIds,
    );
}

export function moveComponents(
    circuit: CircuitLayout,
    componentIds: ReadonlySet<string>,
    offset: Position,
): CircuitLayout | null {
    if (!canMoveComponents(circuit, componentIds, offset)) {
        return null;
    }

    if (offset.x === 0 && offset.y === 0) {
        return circuit;
    }

    return CircuitLayout.from(
        {
            width: circuit.width,
            height: circuit.height,
            components: circuit.components.map((component) =>
                componentIds.has(component.id)
                    ? {
                          ...component,
                          position: {
                              x: component.position.x + offset.x,
                              y: component.position.y + offset.y,
                          },
                      }
                    : component,
            ),
        },
        circuit.registry,
    );
}
