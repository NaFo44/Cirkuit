import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import {
    getModuleId,
    type ModuleDefinition,
} from "../../domain/circuit/modules/moduleDefinition";
import {
    portKey,
    type PortReference,
} from "../../domain/circuit/netlist/netlist";
import type {
    CircuitLayer,
    PlacedComponent,
} from "../../domain/circuit/placedComponent";
import { compileSimulation } from "../../domain/circuit/simulation/compileSimulation";
import type { CanvasPoint } from "../../domain/grid/canvasPoint";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import { getPortRenderPosition } from "../components/componentRenderGeometry";

export interface ProbePort extends PortReference {
    readonly x: number;
    readonly y: number;
    readonly layer: CircuitLayer;
    readonly component: PlacedComponent;
}

export function isConductor(component: PlacedComponent): boolean {
    return component.type === "wire" || component.type === "via";
}

export function createProbeIndex(
    circuit: CircuitLayout,
    modules: readonly ModuleDefinition[] = [],
    primitives: ComponentRegistry = defaultComponentRegistry,
) {
    const netlist = compileSimulation(circuit, primitives, modules).netlist;
    const portsByComponent = new Map<string, readonly ProbePort[]>();
    const portsByKey = new Map<string, ProbePort>();

    for (const component of circuit.components) {
        const descriptor = circuit.registry.get(component.type);
        const ports = descriptor.ports.map<ProbePort>((port) => {
            const point = getPortRenderPosition(component, descriptor, port);

            return {
                componentId: component.id,
                portId: port.id,
                component,
                x: point.x,
                y: point.y,
                layer: point.layer,
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
}

export function findProbePort(
    index: ReturnType<typeof createProbeIndex>,
    circuit: CircuitLayout,
    point: CanvasPoint | null,
    activeLayer: CircuitLayer,
): ProbePort | null {
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

    if (getModuleId(component.type) !== undefined) {
        return (
            ports.find(
                (port) =>
                    Math.floor(port.x / CELL_SIZE) ===
                        Math.floor(point.x / CELL_SIZE) &&
                    Math.floor(port.y / CELL_SIZE) ===
                        Math.floor(point.y / CELL_SIZE),
            ) ?? null
        );
    }

    let nearest: ProbePort | null = null;
    let distance = CELL_SIZE * 0.35;

    for (const port of ports) {
        const candidateDistance = Math.hypot(
            point.x - port.x,
            point.y - port.y,
        );

        if (candidateDistance < distance) {
            nearest = port;
            distance = candidateDistance;
        }
    }

    return nearest;
}
