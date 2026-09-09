import type { Position } from "../../grid/position";
import type { Circuit } from "../circuit";
import type { ComponentRegistry } from "../componentRegistry";
import {
    DIRECTION_OFFSETS,
    oppositeDirection,
    rotateDirection,
} from "../direction";
import type { Direction, PortKind } from "../port";
import { portKey, type Net, type Netlist, type PortReference } from "./netlist";
import { UnionFind } from "./unionFind";

interface ResolvedPort {
    readonly reference: PortReference;
    readonly kind: PortKind;
    readonly position: Position;
    readonly side: Direction;
}

function positionKey(position: Position): string {
    return JSON.stringify([position.x, position.y]);
}

function connectionPointKey(position: Position, side: Direction): string {
    return JSON.stringify([position.x, position.y, side]);
}

function comparePorts(first: PortReference, second: PortReference): number {
    return portKey(first).localeCompare(portKey(second));
}

function validateCircuit(circuit: Circuit, registry: ComponentRegistry): void {
    if (!Number.isInteger(circuit.width) || circuit.width <= 0) {
        throw new Error("Circuit width must be a positive integer");
    }

    if (!Number.isInteger(circuit.height) || circuit.height <= 0) {
        throw new Error("Circuit height must be a positive integer");
    }

    const componentIds = new Set<string>();
    const occupiedPositions = new Set<string>();

    for (const component of circuit.components) {
        if (component.id.trim() === "") {
            throw new Error("Component id cannot be empty");
        }

        if (componentIds.has(component.id)) {
            throw new Error(`Duplicated component id: ${component.id}`);
        }

        componentIds.add(component.id);

        if (
            !Number.isInteger(component.position.x) ||
            !Number.isInteger(component.position.y)
        ) {
            throw new Error(
                `Component position must use integers: ${component.id}`,
            );
        }

        if (
            component.position.x < 0 ||
            component.position.x >= circuit.width ||
            component.position.y < 0 ||
            component.position.y >= circuit.height
        ) {
            throw new Error(
                `Component is outside the circuit: ${component.id}`,
            );
        }

        const key = positionKey(component.position);

        if (occupiedPositions.has(key)) {
            throw new Error(`Multiple components occupy position ${key}`);
        }

        occupiedPositions.add(key);

        if (!registry.has(component.type)) {
            throw new Error(
                `Unknown component type "${component.type}" for component: ${component.id}`,
            );
        }
    }
}

function createNet(resolvedPorts: readonly ResolvedPort[]): Net {
    const ports = resolvedPorts
        .map((port) => port.reference)
        .sort(comparePorts);

    const drivers = resolvedPorts
        .filter((port) => port.kind === "output")
        .map((port) => port.reference)
        .sort(comparePorts);

    const readers = resolvedPorts
        .filter((port) => port.kind === "input")
        .map((port) => port.reference)
        .sort(comparePorts);

    return {
        id: `net:${portKey(ports[0])}`,
        ports,
        drivers,
        readers,
    };
}

export function compileNetlist(
    circuit: Circuit,
    registry: ComponentRegistry,
): Netlist {
    validateCircuit(circuit, registry);

    const connections = new UnionFind();
    const resolvedPorts: ResolvedPort[] = [];
    const portByConnectionPoint = new Map<string, ResolvedPort>();

    for (const component of circuit.components) {
        const definition = registry.get(component.type);

        for (const port of definition.ports) {
            const reference: PortReference = {
                componentId: component.id,
                portId: port.id,
            };

            const resolvedPort: ResolvedPort = {
                reference,
                kind: port.kind,
                position: component.position,
                side: rotateDirection(port.side, component.rotation),
            };

            const key = portKey(reference);
            const pointKey = connectionPointKey(
                resolvedPort.position,
                resolvedPort.side,
            );

            if (portByConnectionPoint.has(pointKey)) {
                throw new Error(
                    `Multiple ports occupy a connection point ${pointKey}`,
                );
            }

            connections.add(key);
            resolvedPorts.push(resolvedPort);
            portByConnectionPoint.set(pointKey, resolvedPort);
        }

        for (const conductiveGroup of definition.conductiveGroups ?? []) {
            const [firstPortId, ...otherPortIds] = conductiveGroup;

            const firstKey = portKey({
                componentId: component.id,
                portId: firstPortId,
            });

            for (const portId of otherPortIds) {
                connections.union(
                    firstKey,
                    portKey({
                        componentId: component.id,
                        portId,
                    }),
                );
            }
        }
    }

    for (const port of resolvedPorts) {
        const offset = DIRECTION_OFFSETS[port.side];
        const neighbourPosition = {
            x: port.position.x + offset.x,
            y: port.position.y + offset.y,
        };

        const neighbour = portByConnectionPoint.get(
            connectionPointKey(neighbourPosition, oppositeDirection(port.side)),
        );

        if (neighbour) {
            connections.union(
                portKey(port.reference),
                portKey(neighbour.reference),
            );
        }
    }

    const portsByRoot = new Map<string, ResolvedPort[]>();

    for (const port of resolvedPorts) {
        const root = connections.find(portKey(port.reference));
        const group = portsByRoot.get(root);

        if (group) {
            group.push(port);
        } else {
            portsByRoot.set(root, [port]);
        }
    }

    const nets = [...portsByRoot.values()]
        .map(createNet)
        .sort((first, second) => first.id.localeCompare(second.id));

    const netByPort = new Map<string, string>();

    for (const net of nets) {
        for (const port of net.ports) {
            netByPort.set(portKey(port), net.id);
        }
    }

    return {
        nets,
        netByPort,
    };
}
