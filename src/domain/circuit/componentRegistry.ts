import type { ComponentDefinition } from "./componentDefinition";

function validateDefinition(definition: ComponentDefinition): void {
    if (definition.type.trim() === "") {
        throw new Error("Component type cannot be empty");
    }

    const portsById = new Map(definition.ports.map((port) => [port.id, port]));

    const sides = new Set<string>();

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

        if (sides.has(port.side)) {
            throw new Error(
                `Duplicated port side "${port.side}" in component type: ${definition.type}`,
            );
        }

        sides.add(port.side);
    }

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

export class ComponentRegistry {
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

    getAll(): readonly ComponentDefinition[] {
        return [...this.definitions.values()];
    }
}
