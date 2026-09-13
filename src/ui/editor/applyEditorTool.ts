import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { Position } from "../../domain/grid/position";
import { createPlacedComponent } from "./createPlacedComponent";
import type { EditorTool } from "./editorTool";

export function applyEditorTool(
    circuit: CircuitLayout,
    tool: EditorTool,
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
