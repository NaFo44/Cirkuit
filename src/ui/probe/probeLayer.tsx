import {
    useEffect,
    useMemo,
    useState,
    type PointerEvent as ReactPointerEvent,
} from "react";

import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import {
    DIRECTION_OFFSETS,
    rotateDirection,
} from "../../domain/circuit/direction";
import { compileNetlist } from "../../domain/circuit/netlist/compileNetlist";
import {
    portKey,
    type PortReference,
} from "../../domain/circuit/netlist/netlist";
import {
    oppositeLayer,
    type CircuitLayer,
    type PlacedComponent,
} from "../../domain/circuit/placedComponent";
import type { CanvasPoint } from "../../domain/grid/canvasPoint";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import { screenToCanvasPoint } from "../grid/canvasCoordinates";

import "./probeLayer.css";

const PORT_OFFSET = CELL_SIZE / 2 - 2;
const PORT_HIT_RADIUS = CELL_SIZE * 0.35;

interface ProbeLayerProps {
    readonly circuit: CircuitLayout;
    readonly activeLayer: CircuitLayer;
}

interface ProbePort extends PortReference {
    readonly x: number;
    readonly y: number;
    readonly layer: CircuitLayer;
    readonly component: PlacedComponent;
}

function isConductor(component: PlacedComponent): boolean {
    return component.type === "wire" || component.type === "via";
}

export function ProbeLayer({ circuit, activeLayer }: ProbeLayerProps) {
    const [hoverPoint, setHoverPoint] = useState<CanvasPoint | null>(null);
    const [pinnedPort, setPinnedPort] = useState<PortReference | null>(null);

    const width = circuit.width * CELL_SIZE;
    const height = circuit.height * CELL_SIZE;

    const index = useMemo(() => {
        const netlist = compileNetlist(circuit, defaultComponentRegistry);

        const portsByComponent = new Map<string, readonly ProbePort[]>();
        const portsByKey = new Map<string, ProbePort>();

        for (const component of circuit.components) {
            const definition = defaultComponentRegistry.get(component.type);
            const centerX = component.position.x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = component.position.y * CELL_SIZE + CELL_SIZE / 2;

            const ports = definition.ports.map<ProbePort>((port) => {
                const side = rotateDirection(port.side, component.rotation);

                const direction = DIRECTION_OFFSETS[side];

                return {
                    componentId: component.id,
                    portId: port.id,
                    component,
                    layer:
                        port.layerOffset === 1
                            ? oppositeLayer(component.layer)
                            : component.layer,
                    x: centerX + direction.x * PORT_OFFSET,
                    y: centerY + direction.y * PORT_OFFSET,
                };
            });

            portsByComponent.set(component.id, ports);

            for (const port of ports) {
                portsByKey.set(portKey(port), port);
            }
        }

        return {
            netlist,
            portsByComponent,
            portsByKey,
            netsById: new Map(netlist.nets.map((net) => [net.id, net])),
        };
    }, [circuit]);

    const portAt = (point: CanvasPoint | null): ProbePort | null => {
        if (!point) {
            return null;
        }

        const component = circuit.getComponentAt(
            {
                x: Math.floor(point.x / CELL_SIZE),
                y: Math.floor(point.y / CELL_SIZE),
            },
            activeLayer,
        );

        if (!component) {
            return null;
        }

        const ports = (index.portsByComponent.get(component.id) ?? []).filter(
            (port) => port.layer === activeLayer,
        );

        if (isConductor(component)) {
            return ports[0] ?? null;
        }

        let nearest: ProbePort | null = null;
        let nearestDistance = PORT_HIT_RADIUS;

        for (const port of ports) {
            const distance = Math.hypot(point.x - port.x, point.y - port.y);

            if (distance < nearestDistance) {
                nearest = port;
                nearestDistance = distance;
            }
        }

        return nearest;
    };

    const hoveredPort = portAt(hoverPoint);

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
                setPinnedPort(portAt(point));
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
