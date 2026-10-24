import type {
    ComponentCatalog,
    ComponentDefinition,
    ComponentDescriptor,
} from "./componentDefinition";
import { isCircuitLayer } from "./placedComponent";
import { getComponentFootprint } from "./componentGeometry";
import { DIRECTIONS } from "./direction";

export function validateComponentDescriptor(
    definition: ComponentDescriptor,
): void {
    if (definition.type.trim() === "") {
        throw new Error("Component type cannot be empty");
    }

    const footprint = getComponentFootprint(definition);

    if (
        !Number.isSafeInteger(footprint.width) ||
        !Number.isSafeInteger(footprint.height) ||
        footprint.width <= 0 ||
        footprint.height <= 0
    ) {
        throw new Error(
            `Component footprint must use positive integer dimensions: ${definition.type}`,
        );
    }

    const portsById = new Map(definition.ports.map((port) => [port.id, port]));
    const portPositions = new Set<string>();

    if (portsById.size !== definition.ports.length) {
        throw new Error(
            `Duplicated port id in component type: ${definition.type}`,
        );
    }

    for (const port of definition.ports) {
        if (port.id.trim() === "") {
            throw new Error(
                `Empty port id in component type: ${definition.type}`,
            );
        }

        const layerOffset = port.layerOffset ?? 0;

        if (!isCircuitLayer(layerOffset)) {
            throw new Error(
                `Invalid port layer offset for "${port.id}" in component type: ${definition.type}`,
            );
        }

        if (!DIRECTIONS.includes(port.side)) {
            throw new Error(
                `Invalid port side for "${port.id}" in component type: ${definition.type}`,
            );
        }

        const offset = port.offset ?? 0;
        const edgeLength =
            port.side === "north" || port.side === "south"
                ? footprint.width
                : footprint.height;

        if (
            !Number.isSafeInteger(offset) ||
            offset < 0 ||
            offset >= edgeLength
        ) {
            throw new Error(
                `Invalid port offset for "${port.id}" in component type: ${definition.type}`,
            );
        }

        const positionKey = `${port.side}:${offset}:${layerOffset}`;

        if (portPositions.has(positionKey)) {
            throw new Error(
                `Duplicated port side "${port.side}" at offset ${offset} on layer offset ${layerOffset} in component type ${definition.type}`,
            );
        }

        portPositions.add(positionKey);
    }
}

function validateDefinition(definition: ComponentDefinition): void {
    validateComponentDescriptor(definition);

    if (
        definition.primaryAction !== undefined &&
        definition.primaryAction.trim() === ""
    ) {
        throw new Error(
            `Primary action cannot be empty in component type ${definition.type}`,
        );
    }

    if (
        definition.primaryAction !== undefined &&
        definition.computeNextState === undefined
    ) {
        throw new Error(
            `Interactive component must define computeNextState: ${definition.type}`,
        );
    }

    const portsById = new Map(definition.ports.map((port) => [port.id, port]));
    const conductivePortIds = new Set<string>();

    for (const group of definition.conductiveGroups ?? []) {
        if (group.length < 2) {
            throw new Error(
                `Conductive groups must contain at least two ports in component type: ${definition.type}`,
            );
        }

        for (const portId of group) {
            const port = portsById.get(portId);

            if (!port) {
                throw new Error(
                    `Unknown conductive port "${portId}" in component type: ${definition.type}`,
                );
            }

            if (port.kind !== "passive") {
                throw new Error(
                    `Conductive port "${portId}" must be passive in component type: ${definition.type}`,
                );
            }

            if (conductivePortIds.has(portId)) {
                throw new Error(
                    `Conductive port "${portId}" belongs to multiple groups in component type: ${definition.type}`,
                );
            }

            conductivePortIds.add(portId);
        }
    }
}

export class ComponentRegistry implements ComponentCatalog {
    private readonly definitions: ReadonlyMap<string, ComponentDefinition>;

    constructor(definitions: readonly ComponentDefinition[]) {
        const definitionsByType = new Map<string, ComponentDefinition>();

        for (const definition of definitions) {
            if (definitionsByType.has(definition.type)) {
                throw new Error(
                    `Duplicated component type: ${definition.type}`,
                );
            }

            validateDefinition(definition);
            definitionsByType.set(definition.type, definition);
        }

        this.definitions = definitionsByType;
    }

    has(type: string): boolean {
        return this.definitions.has(type);
    }

    get(type: string): ComponentDefinition {
        const definition = this.definitions.get(type);

        if (!definition) {
            throw new Error(`Unknown component type: ${type}`);
        }

        return definition;
    }
}
