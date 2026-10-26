import { useState, type DragEvent, type PointerEvent } from "react";

import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import {
    createModuleInstance,
    type ModuleDefinition,
} from "../../domain/circuit/modules/moduleDefinition";
import {
    canPlaceModule,
    placeModule,
    type ModulePlacement,
} from "../../domain/circuit/modules/placeModule";
import type { CircuitLayer } from "../../domain/circuit/placedComponent";
import { CELL_SIZE, worldToGrid } from "../../domain/grid/gridCoordinates";
import type { Position } from "../../domain/grid/position";
import type { ModuleEditorTool } from "../editor/editorTool";
import { screenToCanvasPoint } from "../grid/canvasCoordinates";
import { MODULE_DRAG_TYPE } from "../../domain/circuit/modules/moduleDrag";

interface Options {
    readonly circuit: CircuitLayout;
    readonly modules: readonly ModuleDefinition[];
    readonly tool: ModuleEditorTool | null;
    readonly pointerPosition: Position | null;
    readonly layer: CircuitLayer;
    readonly enabled: boolean;
    readonly onCircuitChange: (circuit: CircuitLayout) => void;
    readonly onPlaced: () => void;
}

export function useModulePlacement({
    circuit,
    modules,
    tool,
    pointerPosition,
    layer,
    enabled,
    onCircuitChange,
    onPlaced,
}: Options) {
    const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<Position | null>(null);

    const moduleId = draggedModuleId ?? tool?.moduleId;
    const definition = modules.find((module) => module.id === moduleId);
    const position = draggedModuleId !== null ? dropPosition : pointerPosition;

    const placement: ModulePlacement | null =
        enabled && definition && position
            ? {
                  moduleId: definition.id,
                  position,
                  rotation:
                      draggedModuleId !== null ? 0 : (tool?.rotation ?? 0),
                  layer,
              }
            : null;

    const preview =
        placement && definition
            ? {
                  component: createModuleInstance(definition.id, {
                      id: "module-preview",
                      position: placement.position,
                      rotation: placement.rotation,
                      layer,
                  }),
                  definition,
                  valid: canPlaceModule(circuit, placement),
              }
            : null;

    function getPosition(event: {
        clientX: number;
        clientY: number;
        currentTarget: HTMLDivElement;
    }): Position | null {
        const bounds = event.currentTarget.getBoundingClientRect();

        if (
            bounds.width <= 0 ||
            bounds.height <= 0 ||
            event.clientX < bounds.left ||
            event.clientX >= bounds.right ||
            event.clientY < bounds.top ||
            event.clientY >= bounds.bottom
        ) {
            return null;
        }

        const point = screenToCanvasPoint({
            width: circuit.width * CELL_SIZE,
            height: circuit.height * CELL_SIZE,
            clientX: event.clientX,
            clientY: event.clientY,
            bounds,
        });

        return worldToGrid(point.x, point.y);
    }

    function commit(next: ModulePlacement) {
        const updated = placeModule(circuit, next, () => crypto.randomUUID());

        if (updated === circuit) {
            return;
        }

        onCircuitChange(updated);
        onPlaced();
    }

    function endDrag() {
        setDraggedModuleId(null);
        setDropPosition(null);
    }

    function startDrag(id: string) {
        if (enabled && modules.some((module) => module.id === id)) {
            setDraggedModuleId(id);
            setDropPosition(null);
        }
    }

    function onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
        if (!enabled || !tool || event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const position = getPosition(event);

        if (position) {
            commit({
                moduleId: tool.moduleId,
                position,
                rotation: tool.rotation,
                layer,
            });
        }
    }

    function onDragOver(event: DragEvent<HTMLDivElement>) {
        if (
            !enabled ||
            !draggedModuleId ||
            !event.dataTransfer.types.includes(MODULE_DRAG_TYPE)
        ) {
            return;
        }

        event.preventDefault();

        const position = getPosition(event);
        setDropPosition(position);

        event.dataTransfer.dropEffect =
            position &&
            canPlaceModule(circuit, {
                moduleId: draggedModuleId,
                position,
                rotation: 0,
                layer,
            })
                ? "copy"
                : "none";
    }

    function onDragLeave(event: DragEvent<HTMLDivElement>) {
        if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
        ) {
            return;
        }

        setDropPosition(null);
    }

    function onDrop(event: DragEvent<HTMLDivElement>) {
        if (
            !draggedModuleId ||
            !event.dataTransfer.types.includes(MODULE_DRAG_TYPE)
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const id = event.dataTransfer.getData(MODULE_DRAG_TYPE);
        const position = getPosition(event);

        if (enabled && id === draggedModuleId && position) {
            commit({
                moduleId: id,
                position,
                rotation: 0,
                layer,
            });
        }

        endDrag();
    }

    return {
        preview,
        startDrag,
        endDrag,
        onPointerDownCapture,
        onDragOver,
        onDragLeave,
        onDrop,
    };
}
