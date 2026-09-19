import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { Position } from "../../domain/grid/position";
import { createPlacedComponent } from "./createPlacedComponent";
import type { CircuitEditorTool } from "./editorTool";

export function applyEditorTool(
    circuit: CircuitLayout,
    tool: CircuitEditorTool,
    position: Position,
): CircuitLayout {
    if (tool.kind === "eraser") {
        return circuit.withoutComponentAt(position);
    }

    const existing = circuit.getComponentAt(position);

    if (
        existing?.type === tool.componentType &&
        existing.rotation === tool.rotation
    ) {
        return circuit;
    }

    return circuit.withComponent(
        createPlacedComponent(tool.componentType, position, tool.rotation),
    );
}
