import { resolvePortGeometry } from "../../domain/circuit/componentGeometry";
import type { ModuleDefinition } from "../../domain/circuit/modules/moduleDefinition";
import { portKey } from "../../domain/circuit/netlist/netlist";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import type { Signal } from "../../domain/circuit/signal";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import { getComponentRenderBounds } from "./componentRenderGeometry";
import { EMPTY_MODULE_PORT_SIGNALS, getSignalLabel } from "./modulePortSignals";
import "./moduleSymbol.css";

interface ModuleSymbolProps {
    readonly component: PlacedComponent;
    readonly definition: ModuleDefinition;
    readonly signals?: ReadonlyMap<string, Signal>;
    readonly inactive?: boolean;
}

const PORT_LABELS = {
    input: "Input",
    output: "Output",
    inout: "Bidirectional",
    passive: "Passive",
} as const;

export function ModuleSymbol({
    component,
    definition,
    signals = EMPTY_MODULE_PORT_SIGNALS,
    inactive = false,
}: ModuleSymbolProps) {
    const descriptor = {
        type: component.type,
        footprint: definition.footprint,
        ports: definition.ports,
    };
    const bounds = getComponentRenderBounds(component, descriptor);
    const ports = definition.ports.map((port) => ({
        port,
        geometry: resolvePortGeometry(component, descriptor, port),
    }));

    const horizontalPadding = ports.some(
        ({ geometry }) => geometry.side === "east" || geometry.side === "west",
    )
        ? CELL_SIZE * 2 + 8
        : 8;

    return (
        <div
            className="module-symbol"
            data-rotation={component.rotation}
            data-inactive={inactive}
        >
            <span
                className="module-symbol__name"
                title={definition.name}
                aria-hidden="true"
                style={{
                    maxWidth: Math.max(0, bounds.width - horizontalPadding),
                }}
            >
                {definition.name}
            </span>

            {ports.map(({ port, geometry }) => {
                const signal = signals.get(
                    portKey({ componentId: component.id, portId: port.id }),
                );
                const label = [
                    port.name,
                    PORT_LABELS[port.kind],
                    signal === undefined ? null : getSignalLabel(signal),
                ]
                    .filter(Boolean)
                    .join(" | ");

                return (
                    <span
                        key={port.id}
                        className="module-symbol__pin"
                        data-side={geometry.side}
                        data-signal={signal ?? "default"}
                        role="img"
                        aria-label={label}
                        title={label}
                        tabIndex={inactive ? -1 : 0}
                        style={{
                            left: geometry.position.x * CELL_SIZE - bounds.left,
                            top: geometry.position.y * CELL_SIZE - bounds.top,
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                        }}
                    >
                        <span
                            className="module-symbol__pin-label"
                            aria-hidden="true"
                        >
                            {port.name}
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
