import type { CircuitLayout } from "../circuitLayout";
import type { ComponentFootprint } from "../componentDefinition";
import { getLocalPortPosition } from "../componentGeometry";
import type { Direction } from "../direction";
import type { PortReference } from "../netlist/netlist";
import { positionKey } from "../../grid/position";
import type { CircuitProject } from "../../project/circuitProject";
import { ModuleCatalog } from "./moduleCatalog";
import type { ModuleDraft } from "./moduleDraft";
import type {
    ModuleDefinition,
    ModulePortDefinition,
} from "./moduleDefinition";

export const MAX_MODULE_BODY_SIZE = 32;
export type DraftPortKind = "input" | "output";
export interface DraftPortSlot {
    readonly side: Direction;
    readonly offset: number;
}

export function getModuleWireReference(
    circuit: CircuitLayout,
    componentId: string,
): PortReference | undefined {
    const component = circuit.getComponentById(componentId);
    if (component?.type !== "wire") return undefined;
    // Wire sides share one conductive group; use a stable reference for storage.
    return { componentId, portId: "north" };
}

export function hasModuleInternalPort(
    circuit: CircuitLayout,
    reference: PortReference,
): boolean {
    const component = circuit.getComponentById(reference.componentId);
    return Boolean(
        component &&
        circuit.registry.has(component.type) &&
        circuit.registry
            .get(component.type)
            .ports.some((port) => port.id === reference.portId),
    );
}

export function getDraftBodyError(
    footprint: ComponentFootprint,
    ports: readonly ModulePortDefinition[],
): string | null {
    const { width, height } = footprint;
    if (
        ![width, height].every(
            (size) =>
                Number.isInteger(size) &&
                size >= 1 &&
                size <= MAX_MODULE_BODY_SIZE,
        )
    ) {
        return `Body dimensions must be between 1 and ${MAX_MODULE_BODY_SIZE} cells.`;
    }
    const occupied = new Set<string>();
    const descriptor = { type: "module:draft", footprint, ports };
    for (const port of ports) {
        const offset = port.offset ?? 0;
        const length =
            port.side === "north" || port.side === "south" ? width : height;
        if (!Number.isInteger(offset) || offset < 0 || offset >= length) {
            return `Move port ${port.name || port.id} before shrinking the body.`;
        }
        const cell = positionKey(getLocalPortPosition(descriptor, port));
        if (occupied.has(cell)) return "Two ports cannot occupy the same cell.";
        occupied.add(cell);
    }
    return null;
}

export function findFreeDraftPortSlot(
    draft: ModuleDraft,
    kind: DraftPortKind,
): DraftPortSlot | null {
    if (getDraftBodyError(draft.footprint, draft.ports)) return null;
    const preferred: Direction = kind === "input" ? "west" : "east";
    const sides: Direction[] = [
        preferred,
        ...(["west", "east", "north", "south"] as const).filter(
            (side) => side !== preferred,
        ),
    ];
    const descriptor = {
        type: "module:draft",
        footprint: draft.footprint,
        ports: draft.ports,
    };
    const occupied = new Set(
        draft.ports.map((port) =>
            positionKey(getLocalPortPosition(descriptor, port)),
        ),
    );
    for (const side of sides) {
        const length =
            side === "north" || side === "south"
                ? draft.footprint.width
                : draft.footprint.height;
        const offsets = [
            ...Array.from(
                { length: Math.max(0, length - 2) },
                (_, index) => index + 1,
            ),
            0,
            length - 1,
        ];
        for (const offset of new Set(offsets)) {
            const slot = { side, offset };
            const cell = positionKey(
                getLocalPortPosition(descriptor, {
                    ...slot,
                    id: "candidate",
                    kind,
                }),
            );
            if (!occupied.has(cell)) return slot;
        }
    }
    return null;
}

export function suggestDraftPortName(
    draft: ModuleDraft,
    kind: DraftPortKind,
): string {
    const names = new Set(draft.ports.map((port) => port.name));
    const candidates = kind === "input" ? "ABCDEFGHIJKLMNOPQRSTUVWX" : "YZQ";
    for (const name of candidates) if (!names.has(name)) return name;
    let index = 1;
    const prefix = kind === "input" ? "IN" : "OUT";
    while (names.has(`${prefix}${index}`)) index++;
    return `${prefix}${index}`;
}

export function createModuleDefinitionFromDraft(
    draft: ModuleDraft,
    project: CircuitProject,
): ModuleDefinition {
    if (!draft.name.trim()) throw new Error("Give the module a name.");
    if (project.circuit.components.length === 0)
        throw new Error("Build an internal circuit first.");
    if (draft.ports.length === 0)
        throw new Error("Expose at least one input or output.");
    const bodyError = getDraftBodyError(draft.footprint, draft.ports);
    if (bodyError) throw new Error(bodyError);
    for (const port of draft.ports) {
        if (!port.name.trim()) throw new Error("Give every port a name.");
        if (!hasModuleInternalPort(project.circuit, port.internalPort)) {
            throw new Error(
                `Reconnect or remove port ${port.name}: its internal connection is missing.`,
            );
        }
    }
    const definition: ModuleDefinition = {
        id: draft.id,
        name: draft.name.trim(),
        footprint: { ...draft.footprint },
        ports: draft.ports.map((port) => ({
            ...port,
            name: port.name.trim(),
            internalPort: { ...port.internalPort },
        })),
        circuit: project.circuit,
        annotations: project.annotations,
    };
    return new ModuleCatalog([definition], project.circuit.registry).getModule(
        draft.id,
    );
}

export function getModuleDraftError(
    draft: ModuleDraft,
    project: CircuitProject,
): string | null {
    try {
        createModuleDefinitionFromDraft(draft, project);
        return null;
    } catch (error) {
        return error instanceof Error
            ? error.message
            : "The module is not ready yet.";
    }
}
