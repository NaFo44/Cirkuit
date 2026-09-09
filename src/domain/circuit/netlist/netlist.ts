export interface PortReference {
    readonly componentId: string;
    readonly portId: string;
}

export interface Net {
    readonly id: string;

    readonly ports: readonly PortReference[];
    readonly drivers: readonly PortReference[];
    readonly readers: readonly PortReference[];
}

export interface Netlist {
    readonly nets: readonly Net[];

    readonly netByPort: ReadonlyMap<string, string>;
}

export function portKey(port: PortReference): string {
    return JSON.stringify([port.componentId, port.portId]);
}
