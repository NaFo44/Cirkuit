import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { CircuitLayer } from "../../domain/circuit/placedComponent";
import type { PortReference } from "../../domain/circuit/netlist/netlist";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import "./modulePortPicker.css";
import type { DraftPortKind } from "../../domain/circuit/modules/moduleDraftConfiguration";

export type ModulePortPickRequest =
    | { readonly type: "add"; readonly kind: DraftPortKind }
    | { readonly type: "reconnect"; readonly portId: string };

interface Props {
    readonly circuit: CircuitLayout;
    readonly layer: CircuitLayer;
    readonly onPick: (componentId: string) => void;
    readonly interactive: boolean;
    readonly selectedReference?: PortReference;
}

function WireSelectionMarker() {
    return (
        <svg
            className="module-port-picker__marker"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
            shapeRendering="crispEdges"
        >
            <path
                d="M6 1.5H1.5V6 M14 1.5H18.5V6 M18.5 14V18.5H14 M6 18.5H1.5V14"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeLinecap="square"
            />
        </svg>
    );
}

export function ModulePortPicker({
    circuit,
    layer,
    onPick,
    interactive,
    selectedReference,
}: Props) {
    return (
        <div
            className="module-port-picker"
            role="group"
            aria-label="Choose a wire cell"
            aria-hidden={!interactive}
        >
            {circuit.components.flatMap((component) => {
                if (component.type !== "wire" || component.layer !== layer)
                    return [];
                const selected =
                    selectedReference?.componentId === component.id;
                const style = {
                    left: component.position.x * CELL_SIZE,
                    top: component.position.y * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                };
                if (!interactive)
                    return selected
                        ? [
                              <span
                                  key={component.id}
                                  className="module-port-picker__selection"
                                  style={style}
                              >
                                  <WireSelectionMarker />
                              </span>,
                          ]
                        : [];
                const label = `Select wire at ${component.position.x},${component.position.y}`;
                return [
                    <button
                        key={component.id}
                        type="button"
                        className="module-port-picker__target"
                        data-selected={selected}
                        style={style}
                        title={label}
                        aria-label={label}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={(event) => {
                            event.stopPropagation();
                            onPick(component.id);
                        }}
                    >
                        <WireSelectionMarker />
                    </button>,
                ];
            })}
        </div>
    );
}
