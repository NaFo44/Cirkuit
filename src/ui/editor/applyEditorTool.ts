import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { CircuitLayer } from "../../domain/circuit/placedComponent";
import type { Position } from "../../domain/grid/position";
import { createPlacedComponent } from "./createPlacedComponent";
import type { CircuitEditorTool } from "./editorTool";

export function applyEditorTool(
    circuit: CircuitLayout,
    tool: CircuitEditorTool,
    position: Position,
    layer: CircuitLayer = 0,
): CircuitLayout {
    if (tool.kind === "eraser") {
        return circuit.withoutComponentAt(position, layer);
    }

    const existing = circuit.getComponentAt(position, layer);

    if (
        existing?.type === tool.componentType &&
        existing.rotation === tool.rotation &&
        (existing.type === "via" || existing.layer === layer)
    ) {
        return circuit;
    }

    return circuit.withComponent(
        createPlacedComponent(
            tool.componentType,
            position,
            tool.rotation,
            layer,
        ),
    );
}
