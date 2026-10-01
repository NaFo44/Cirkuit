import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { Circuit } from "../../domain/circuit/circuit";
import {
    CELL_SIZE,
    cellsBetween,
    gridToWorld,
    worldToGrid,
} from "../../domain/grid/gridCoordinates";
import type { Position } from "../../domain/grid/position";
import { ComponentGlyph } from "../components/componentGlyph";
import type { ComponentVisualState } from "../components/componentVisualState";
import type {
    CircuitLayer,
    PlacedComponent,
} from "../../domain/circuit/placedComponent";
import { createCellLighting } from "../lighting/createCellLighting";
import {
    getComponentHoverLabel,
    getComponentPresentation,
} from "../components/componentPresentation";

interface CircuitGridProps {
    circuit: Circuit;
    activeLayer?: CircuitLayer;
    onCellPaint?: (position: Position) => void;
    onPaintStart?: () => void;
    onPaintEnd?: () => void;
    onComponentInteract?: (component: PlacedComponent) => void;
    isComponentInteractive?: (component: PlacedComponent) => boolean;
    componentVisualStates: ReadonlyMap<string, ComponentVisualState>;
    onHoveredComponentChange?: (componentId: string | null) => void;
    selectedComponentIds?: ReadonlySet<string>;
}

export function CircuitGrid({
    circuit,
    activeLayer = 0,
    onCellPaint,
    onPaintStart,
    onPaintEnd,
    onComponentInteract,
    isComponentInteractive,
    componentVisualStates,
    onHoveredComponentChange,
    selectedComponentIds,
}: CircuitGridProps) {
    const activePointerId = useRef<number | null>(null);
    const lastPaintedCell = useRef<Position | null>(null);
    const litCells = useMemo(
        () => createCellLighting(circuit, componentVisualStates),
        [circuit, componentVisualStates],
    );

    const renderedComponents = useMemo(() => {
        const renderPriority = (component: PlacedComponent): number => {
            if (component.type === "via") {
                return 2;
            }

            return component.layer === activeLayer ? 1 : 0;
        };

        return [...circuit.components].sort(
            (first, second) => renderPriority(first) - renderPriority(second),
        );
    }, [activeLayer, circuit.components]);

    const paintAtPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
        const gridElement = event.currentTarget;
        const bounds = gridElement.getBoundingClientRect();

        const scaleX = bounds.width / gridElement.offsetWidth;
        const scaleY = bounds.height / gridElement.offsetHeight;

        const localX =
            (event.clientX - bounds.left) / scaleX - gridElement.clientLeft;
        const localY =
            (event.clientY - bounds.top) / scaleY - gridElement.clientTop;

        const position = worldToGrid(localX, localY);
        const { x, y } = position;

        if (x < 0 || y < 0 || x >= circuit.width || y >= circuit.height) {
            return;
        }

        const previousCell = lastPaintedCell.current;

        if (previousCell?.x === x && previousCell.y === y) {
            return;
        }

        const cells = previousCell
            ? cellsBetween(previousCell, position).slice(1)
            : [position];

        lastPaintedCell.current = position;

        for (const cell of cells) {
            onCellPaint?.(cell);
        }
    };

    const startPainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (
            event.button !== 0 ||
            activePointerId.current !== null ||
            !onCellPaint
        ) {
            return;
        }

        event.preventDefault();

        activePointerId.current = event.pointerId;
        lastPaintedCell.current = null;

        onPaintStart?.();

        event.currentTarget.setPointerCapture(event.pointerId);

        paintAtPointer(event);
    };

    const continuePainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointerId.current === event.pointerId) {
            paintAtPointer(event);
        }
    };

    const stopPainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointerId.current !== event.pointerId) {
            return;
        }

        paintAtPointer(event);
        activePointerId.current = null;
        lastPaintedCell.current = null;

        onPaintEnd?.();

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const cancelPainting = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointerId.current === event.pointerId) {
            activePointerId.current = null;
            lastPaintedCell.current = null;

            onPaintEnd?.();
        }
    };

    return (
        <div
            className={`circuit-grid${
                onCellPaint ? " circuit-grid--editable" : ""
            }`}
            style={{
                width: circuit.width * CELL_SIZE,
                height: circuit.height * CELL_SIZE,
                backgroundSize: `${CELL_SIZE * 2}px ${CELL_SIZE * 2}px`,
            }}
            role="grid"
            aria-label="Circuit grid"
            aria-rowcount={circuit.height}
            aria-colcount={circuit.width}
            onPointerDown={startPainting}
            onPointerMove={continuePainting}
            onPointerUp={stopPainting}
            onPointerCancel={cancelPainting}
            onLostPointerCapture={cancelPainting}
        >
            {litCells.map(({ position, level }) => {
                const worldPosition = gridToWorld(position.x, position.y);

                return (
                    <div
                        key={`${position.x},${position.y}`}
                        className={`circuit-lighting-cell circuit-lighting-cell--${level}`}
                        style={{
                            left: worldPosition.x,
                            top: worldPosition.y,
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                        }}
                        aria-hidden="true"
                    />
                );
            })}

            {renderedComponents.map((component) => {
                const isVia = component.type === "via";
                const isActiveLayer = component.layer === activeLayer;

                const isInactiveLayer = !isVia && !isActiveLayer;

                const { x, y } = component.position;
                const position = gridToWorld(x, y);
                const visualState =
                    componentVisualStates.get(component.id) ?? "default";
                const interactive =
                    !isInactiveLayer &&
                    onComponentInteract !== undefined &&
                    (isComponentInteractive?.(component) ?? true);
                const presentation = getComponentPresentation(component.type);
                const hidesGlyph = presentation.glyphVisibility === "hidden";
                const hoverLabel = getComponentHoverLabel(
                    component.type,
                    visualState,
                );
                const selected =
                    selectedComponentIds?.has(component.id) ?? false;

                return (
                    <div
                        key={component.id}
                        role="gridcell"
                        className={[
                            "circuit-component",
                            `circuit-cell--${component.type}`,
                            `circuit-component--${visualState}`,
                            `circuit-component--glyph-${presentation.glyphVisibility}`,
                            interactive ? "circuit-component--interactive" : "",
                            isInactiveLayer
                                ? "circuit-component--inactive-layer"
                                : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        tabIndex={interactive ? 0 : undefined}
                        onClick={
                            interactive
                                ? () => onComponentInteract(component)
                                : undefined
                        }
                        onKeyDown={
                            interactive
                                ? (event) => {
                                      if (event.key === "Enter") {
                                          event.preventDefault();
                                          onComponentInteract(component);
                                      }
                                  }
                                : undefined
                        }
                        onPointerEnter={() =>
                            onHoveredComponentChange?.(component.id)
                        }
                        onPointerLeave={() => onHoveredComponentChange?.(null)}
                        onFocus={() => onHoveredComponentChange?.(component.id)}
                        onBlur={() => onHoveredComponentChange?.(null)}
                        style={{
                            left: position.x,
                            top: position.y,
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                            opacity: isInactiveLayer ? 0.25 : 1,
                            pointerEvents: isInactiveLayer ? "none" : "auto",
                        }}
                        aria-label={`Cell ${x},${y}, layer ${component.layer}: ${hoverLabel}, ${component.rotation} degrees`}
                        aria-rowindex={y + 1}
                        aria-colindex={x + 1}
                        aria-selected={selected || undefined}
                        data-visual-state={visualState}
                    >
                        {!hidesGlyph && (
                            <ComponentGlyph
                                componentType={component.type}
                                size={14}
                                rotation={component.rotation}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
