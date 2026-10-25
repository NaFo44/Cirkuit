import type { Circuit } from "../domain/circuit/circuit";
import type { Direction } from "../domain/circuit/direction";
import type { ModuleDefinition } from "../domain/circuit/modules/moduleDefinition";
import type {
    CircuitLayer,
    PlacedComponent,
    Rotation,
} from "../domain/circuit/placedComponent";
import type { PortKind } from "../domain/circuit/port";

export function simulationComponent(
    id: string,
    type: string,
    x: number,
    y: number,
    rotation: Rotation = 0,
    layer: CircuitLayer = 0,
): PlacedComponent {
    return { id, type, position: { x, y }, rotation, layer };
}

export function simulationCircuit(
    components: readonly PlacedComponent[],
): Circuit {
    return { width: 30, height: 30, components };
}

export function modulePort(
    id: string,
    kind: PortKind,
    side: Direction,
    internalPortId: string = id,
    offset = 1,
): ModuleDefinition["ports"][number] {
    return {
        id,
        name: id,
        kind,
        side,
        offset,
        internalPort: {
            componentId: "inner",
            portId: internalPortId,
        },
    };
}

export function componentModule(
    type: string,
    ports: ModuleDefinition["ports"],
): ModuleDefinition {
    return {
        id: type,
        name: type,
        footprint: { width: 3, height: 3 },
        ports,
        annotations: [],
        circuit: {
            width: 1,
            height: 1,
            components: [simulationComponent("inner", type, 0, 0)],
        },
    };
}

export function createXorModule(): ModuleDefinition {
    const rows = [
        "wwwwww.......",
        ".w...w.......",
        ".w..wAwnww...",
        ".w..w....w...",
        "wAwnww..wAwnw",
        "w....w..w....",
        "wwwwwAwnw....",
    ];

    const types: Record<string, string> = {
        w: "wire",
        A: "and",
        n: "not",
    };

    const components = rows.flatMap((row, y) =>
        [...row].flatMap((glyph, x) =>
            glyph === "."
                ? []
                : [simulationComponent(`c${x}-${y}`, types[glyph], x, y)],
        ),
    );

    return {
        id: "xor",
        name: "XOR",
        footprint: { width: 3, height: 4 },
        ports: [
            {
                id: "a",
                name: "A",
                kind: "input",
                side: "west",
                offset: 1,
                internalPort: {
                    componentId: "c0-0",
                    portId: "west",
                },
            },
            {
                id: "b",
                name: "B",
                kind: "input",
                side: "west",
                offset: 2,
                internalPort: {
                    componentId: "c0-6",
                    portId: "west",
                },
            },
            {
                id: "q",
                name: "Q",
                kind: "output",
                side: "east",
                offset: 1,
                internalPort: {
                    componentId: "c12-4",
                    portId: "east",
                },
            },
        ],
        circuit: { width: 13, height: 7, components },
        annotations: [],
    };
}
