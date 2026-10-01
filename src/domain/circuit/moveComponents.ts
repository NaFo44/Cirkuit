import type { Position } from "../grid/position";
import { CircuitLayout } from "./circuitLayout";
import { getOccupiedLayers } from "./placedComponent";

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

    const remainingCircuit = circuit.withoutComponents(componentIds);

    return selectedComponents.every((component) => {
        const position = {
            x: component.position.x + offset.x,
            y: component.position.y + offset.y,
        };

        if (
            position.x < 0 ||
            position.x >= circuit.width ||
            position.y < 0 ||
            position.y >= circuit.height
        ) {
            return false;
        }

        return getOccupiedLayers(component).every(
            (layer) =>
                remainingCircuit.getComponentAt(position, layer) === undefined,
        );
    });
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

    return CircuitLayout.from({
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
    });
}
