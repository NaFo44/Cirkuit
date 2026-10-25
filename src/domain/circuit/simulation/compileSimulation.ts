import type { Circuit } from "../circuit";
import type { ComponentRegistry } from "../componentRegistry";
import { ModuleCatalog } from "../modules/moduleCatalog";
import {
    getModuleId,
    type ModuleDefinition,
} from "../modules/moduleDefinition";
import { compileNetlist } from "../netlist/compileNetlist";
import {
    portKey,
    type Net,
    type Netlist,
    type PortReference,
} from "../netlist/netlist";
import { UnionFind } from "../netlist/unionFind";
import type { PlacedComponent } from "../placedComponent";

export interface CompiledSimulation {
    readonly components: readonly PlacedComponent[];
    readonly netlist: Netlist;
    readonly moduleComponents: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

export function compileSimulation(
    circuit: Circuit,
    registry: ComponentRegistry,
    modules: readonly ModuleDefinition[] = [],
): CompiledSimulation {
    const catalog = new ModuleCatalog(modules, registry);
    const parentNetlist = compileNetlist(circuit, catalog);

    const instances = circuit.components
        .filter((component) => getModuleId(component.type) !== undefined)
        .sort((a, b) => a.id.localeCompare(b.id));

    const moduleComponents = new Map<string, ReadonlyMap<string, string>>();

    if (instances.length === 0) {
        return {
            components: circuit.components,
            netlist: parentNetlist,
            moduleComponents,
        };
    }

    const modulesIds = new Set(instances.map((instance) => instance.id));

    const components = circuit.components.filter(
        (component) => !modulesIds.has(component.id),
    );

    const usedIds = new Set(
        circuit.components.map((component) => component.id),
    );

    const connections = new UnionFind();
    const references = new Map<string, PortReference>();
    const drivers = new Set<string>();
    const readers = new Set<string>();

    const addNetlist = (
        netlist: Netlist,
        mapReference: (reference: PortReference) => PortReference,
        executable: (reference: PortReference) => boolean = () => true,
    ): void => {
        for (const net of netlist.nets) {
            const ports = net.ports.map(mapReference);

            for (const port of ports) {
                const key = portKey(port);

                connections.add(key);
                references.set(key, port);
                connections.union(portKey(ports[0]), key);
            }

            for (const port of net.drivers.filter(executable)) {
                drivers.add(portKey(mapReference(port)));
            }

            for (const port of net.readers.filter(executable)) {
                readers.add(portKey(mapReference(port)));
            }
        }
    };

    addNetlist(
        parentNetlist,
        (reference) => reference,
        (reference) => !modulesIds.has(reference.componentId),
    );

    const internalNetlists = new Map<string, Netlist>();

    for (const instance of instances) {
        const definition = catalog.getModule(getModuleId(instance.type)!);
        const componentIds = new Map<string, string>();

        for (const internal of definition.circuit.components) {
            let id = `@${JSON.stringify([instance.id, internal.id])}`;

            while (usedIds.has(id)) {
                id = `@${id}`;
            }

            usedIds.add(id);
            componentIds.set(internal.id, id);
            components.push({ ...internal, id });
        }

        moduleComponents.set(instance.id, componentIds);

        let internalNetlist = internalNetlists.get(definition.id);

        if (!internalNetlist) {
            internalNetlist = compileNetlist(definition.circuit, registry);
            internalNetlists.set(definition.id, internalNetlist);
        }

        const scopedReference = (reference: PortReference): PortReference => ({
            componentId: componentIds.get(reference.componentId)!,
            portId: reference.portId,
        });

        addNetlist(internalNetlist, scopedReference);

        for (const port of definition.ports) {
            connections.union(
                portKey({ componentId: instance.id, portId: port.id }),
                portKey(scopedReference(port.internalPort)),
            );
        }
    }

    const portsByRoot = new Map<string, PortReference[]>();

    for (const [key, reference] of references) {
        const root = connections.find(key);
        const ports = portsByRoot.get(root) ?? [];

        ports.push(reference);
        portsByRoot.set(root, ports);
    }

    const nets: Net[] = [...portsByRoot.values()]
        .map((ports) => {
            ports.sort((a, b) => portKey(a).localeCompare(portKey(b)));

            return {
                id: `net:${portKey(ports[0])}`,
                ports,
                drivers: ports.filter((port) => drivers.has(portKey(port))),
                readers: ports.filter((port) => readers.has(portKey(port))),
            };
        })
        .sort((a, b) => a.id.localeCompare(b.id));

    const netByPort = new Map<string, string>();

    for (const net of nets) {
        for (const port of net.ports) {
            netByPort.set(portKey(port), net.id);
        }
    }

    return {
        components,
        netlist: { nets, netByPort },
        moduleComponents,
    };
}
