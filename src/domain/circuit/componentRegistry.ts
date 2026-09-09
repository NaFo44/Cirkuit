import type {
    ComponentDefinition,
} from "./componentDefinition";

export class ComponentRegistry {
    private readonly definitions: ReadonlyMap<string, ComponentDefinition>;

    constructor(definitions: readonly ComponentDefinition[]) {
        const definitionsByType = new Map<string, ComponentDefinition>();

        for (const definition of definitions) {
            if (definitionsByType.has(definition.type)) {
                if (definitionsByType.has(definition.type)) {
                    throw new Error(`Duplicated component type: ${definitionsByType}`);
                }
            }

            definitionsByType.set(
                definition.type,
                definition,
            );
        }

        this.definitions = definitionsByType;
    }

    get(type: string): ComponentDefinition {
        const definition = this.definitions.get(type);

        if (!definition) {
            throw new Error(`Unknown component type: ${type}`)
        }

        return definition;
    }

    getAll(): readonly ComponentDefinition[] {
        return [...this.definitions.values()];
    }
}