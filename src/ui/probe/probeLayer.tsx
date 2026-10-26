import {
    useEffect,
    useMemo,
    useState,
    type PointerEvent as ReactPointerEvent,
} from "react";

import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { ModuleDefinition } from "../../domain/circuit/modules/moduleDefinition";
import {
    portKey,
    type PortReference,
} from "../../domain/circuit/netlist/netlist";
import type {
    CircuitLayer,
    PlacedComponent,
} from "../../domain/circuit/placedComponent";
import type { CanvasPoint } from "../../domain/grid/canvasPoint";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import { screenToCanvasPoint } from "../grid/canvasCoordinates";
import {
    createProbeIndex,
    findProbePort,
    isConductor,
    type ProbePort,
} from "./createProbeIndex";

import "./probeLayer.css";

const EMPTY_MODULES: readonly ModuleDefinition[] = [];

interface ProbeLayerProps {
    readonly circuit: CircuitLayout;
    readonly activeLayer: CircuitLayer;
    readonly modules?: readonly ModuleDefinition[];
}

export function ProbeLayer({
    circuit,
    activeLayer,
    modules = EMPTY_MODULES,
}: ProbeLayerProps) {
    const [hoverPoint, setHoverPoint] = useState<CanvasPoint | null>(null);
    const [pinnedPort, setPinnedPort] = useState<PortReference | null>(null);

    const width = circuit.width * CELL_SIZE;
    const height = circuit.height * CELL_SIZE;

    const index = useMemo(
        () => createProbeIndex(circuit, modules),
        [circuit, modules],
    );

    const hoveredPort = findProbePort(index, circuit, hoverPoint, activeLayer);

    const pinnedNetId = pinnedPort
        ? index.netlist.netByPort.get(portKey(pinnedPort))
        : undefined;

    const hoveredNetId = hoveredPort
        ? index.netlist.netByPort.get(portKey(hoveredPort))
        : undefined;

    const netId = pinnedNetId ?? hoveredNetId;
    const net = netId === undefined ? undefined : index.netsById.get(netId);

    const conductors = new Map<string, PlacedComponent>();
    const terminals: ProbePort[] = [];

    for (const reference of net?.ports ?? []) {
        const port = index.portsByKey.get(portKey(reference));

        if (!port) {
            continue;
        }

        if (isConductor(port.component)) {
            conductors.set(port.componentId, port.component);
        } else {
            terminals.push(port);
        }
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") {
                return;
            }

            if (
                event.target instanceof HTMLElement &&
                (event.target.isContentEditable ||
                    event.target.closest("input, textarea, select"))
            ) {
                return;
            }

            setPinnedPort(null);
            setHoverPoint(null);
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const pointFromEvent = (
        event: ReactPointerEvent<HTMLDivElement>,
    ): CanvasPoint =>
        screenToCanvasPoint({
            width,
            height,
            clientX: event.clientX,
            clientY: event.clientY,
            bounds: event.currentTarget.getBoundingClientRect(),
        });

    return (
        <div
            className="probe-layer"
            onPointerMove={(event) => {
                if (event.buttons === 0) {
                    setHoverPoint(pointFromEvent(event));
                }
            }}
            onPointerLeave={() => setHoverPoint(null)}
            onPointerDown={(event) => {
                if (event.button !== 0) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const point = pointFromEvent(event);

                setHoverPoint(point);
                setPinnedPort(
                    findProbePort(index, circuit, point, activeLayer),
                );
            }}
        >
            <svg
                className="probe-layer__drawing"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                aria-hidden="true"
            >
                {[...conductors.values()].map((component) => (
                    <rect
                        key={component.id}
                        className="probe-layer__wire"
                        data-inactive={
                            component.type !== "via" &&
                            component.layer !== activeLayer
                        }
                        x={component.position.x * CELL_SIZE}
                        y={component.position.y * CELL_SIZE}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                    />
                ))}

                {terminals.map((port) => (
                    <circle
                        key={portKey(port)}
                        className="probe-layer__port"
                        data-inactive={port.layer !== activeLayer}
                        cx={port.x}
                        cy={port.y}
                        r={4}
                    />
                ))}
            </svg>
        </div>
    );
}
