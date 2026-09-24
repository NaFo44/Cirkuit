import { useState, type PointerEvent as ReactPointerEvent } from "react";

import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import type { CanvasPoint } from "../../domain/grid/canvasPoint";
import { CELL_SIZE, worldToGrid } from "../../domain/grid/gridCoordinates";
import type { Position } from "../../domain/grid/position";
import { screenToCanvasPoint } from "../grid/canvasCoordinates";
import {
    createSelectionRectangle,
    type SelectionRectangle,
} from "./componentSelection";
import "./selectionLayer.css";

export type SelectionInteractionMode = "disabled" | "move" | "select";

interface SelectionLayerProps {
    readonly width: number;
    readonly height: number;
    readonly interactionMode: SelectionInteractionMode;
    readonly selectedComponents: readonly PlacedComponent[];

    readonly onSelect: (rectangle: SelectionRectangle) => void;
    readonly canMove: (offset: Position) => boolean;
    readonly onMove: (offset: Position) => void;
}

interface RectangleGesture {
    readonly kind: "rectangle";
    readonly pointerId: number;
    readonly start: CanvasPoint;
    readonly current: CanvasPoint;
}

interface MoveGesture {
    readonly kind: "move";
    readonly pointerId: number;
    readonly startCell: Position;
    readonly offset: Position;
}

type SelectionGesture = RectangleGesture | MoveGesture;

function isZeroOffset(offset: Position): boolean {
    return offset.x === 0 && offset.y === 0;
}

export function SelectionLayer({
    width,
    height,
    interactionMode,
    selectedComponents,
    onSelect,
    canMove,
    onMove,
}: SelectionLayerProps) {
    const [gesture, setGesture] = useState<SelectionGesture | null>(null);

    const pointFromEvent = (
        event: ReactPointerEvent<HTMLDivElement>,
    ): CanvasPoint => {
        const bounds = event.currentTarget.getBoundingClientRect();

        return screenToCanvasPoint({
            width,
            height,
            clientX: event.clientX,
            clientY: event.clientY,
            bounds,
        });
    };

    const moveOffsetFromEvent = (
        event: ReactPointerEvent<HTMLDivElement>,
        startCell: Position,
    ): Position => {
        const point = pointFromEvent(event);
        const currentCell = worldToGrid(point.x, point.y);

        return {
            x: currentCell.x - startCell.x,
            y: currentCell.y - startCell.y,
        };
    };

    const startGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (
            interactionMode === "disabled" ||
            event.button !== 0 ||
            gesture !== null
        ) {
            return;
        }

        const target = event.target;

        const isMoveHandle =
            target instanceof Element &&
            target.closest("[data-selection-move-handle]") !== null;

        if (interactionMode === "move" && !isMoveHandle) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);

        const point = pointFromEvent(event);

        if (interactionMode === "select") {
            setGesture({
                kind: "rectangle",
                pointerId: event.pointerId,
                start: point,
                current: point,
            });
            return;
        }

        setGesture({
            kind: "move",
            pointerId: event.pointerId,
            startCell: worldToGrid(point.x, point.y),
            offset: { x: 0, y: 0 },
        });
    };

    const continueGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!gesture || gesture.pointerId !== event.pointerId) {
            return;
        }

        if (gesture.kind === "rectangle") {
            setGesture({
                ...gesture,
                current: pointFromEvent(event),
            });
            return;
        }

        setGesture({
            ...gesture,
            offset: moveOffsetFromEvent(event, gesture.startCell),
        });
    };

    const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!gesture || gesture.pointerId !== event.pointerId) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        if (gesture.kind === "rectangle") {
            onSelect(
                createSelectionRectangle(gesture.start, pointFromEvent(event)),
            );
        } else {
            const offset = moveOffsetFromEvent(event, gesture.startCell);

            if (!isZeroOffset(offset) && canMove(offset)) {
                onMove(offset);
            }
        }

        setGesture(null);
    };

    const cancelGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (gesture?.pointerId === event.pointerId) {
            setGesture(null);
        }
    };

    const rectangle =
        gesture?.kind === "rectangle"
            ? createSelectionRectangle(gesture.start, gesture.current)
            : null;

    const moveOffset =
        gesture?.kind === "move" ? gesture.offset : { x: 0, y: 0 };

    const isMoveValid = gesture?.kind !== "move" || canMove(moveOffset);

    return (
        <div
            className={[
                "selection-layer",
                interactionMode === "move"
                    ? "selection-layer--move-enabled"
                    : "",
                interactionMode === "select"
                    ? "selection-layer--selecting"
                    : "",
                gesture?.kind === "move" ? "selection-layer--moving" : "",
            ]
                .filter(Boolean)
                .join(" ")}
            style={{ width, height }}
            aria-hidden="true"
            onPointerDown={startGesture}
            onPointerMove={continueGesture}
            onPointerUp={finishGesture}
            onPointerCancel={cancelGesture}
            onLostPointerCapture={cancelGesture}
        >
            {selectedComponents.map((component) => (
                <div
                    key={component.id}
                    className="selection-layer__move-handle"
                    data-selection-move-handle
                    style={{
                        left: component.position.x * CELL_SIZE,
                        top: component.position.y * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                    }}
                />
            ))}

            {rectangle && (
                <div
                    className="selection-layer__rectangle"
                    style={{
                        left: rectangle.left,
                        top: rectangle.top,
                        width: rectangle.right - rectangle.left,
                        height: rectangle.bottom - rectangle.top,
                    }}
                />
            )}

            {gesture?.kind === "move" &&
                selectedComponents.map((component) => (
                    <div
                        key={component.id}
                        className={[
                            "selection-layer__move-preview",
                            isMoveValid
                                ? ""
                                : "selection-layer__move-preview--invalid",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        style={{
                            left:
                                (component.position.x + moveOffset.x) *
                                CELL_SIZE,
                            top:
                                (component.position.y + moveOffset.y) *
                                CELL_SIZE,
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                        }}
                    />
                ))}
        </div>
    );
}
