import { CircuitLayout } from "../circuitLayout";
import type {
    ComponentCatalog,
    ComponentDescriptor,
} from "../componentDefinition";
import { validateComponentDescriptor } from "../componentRegistry";
import { defaultComponentRegistry } from "../components/builtInComponents";
import {
    getModuleComponentType,
    getModuleId,
    MODULE_TYPE_PREFIX,
    type ModuleDefinition,
} from "./moduleDefinition";

function validateModuleDefinition(
    definition: ModuleDefinition,
    primitives: ComponentCatalog,
): void {
    const type = getModuleComponentType(definition.id);

    if (definition.name.trim() === "") {
        throw new Error(`Module name cannot be empty: ${definition.id}`);
    }

    if (primitives.has(type)) {
        throw new Error(`Module type conflicts with a primitive: ${type}`);
    }

    validateComponentDescriptor({
        type,
        footprint: definition.footprint,
        ports: definition.ports,
    });

    for (const component of definition.circuit.components) {
        if (component.type.startsWith(MODULE_TYPE_PREFIX)) {
            throw new Error(
                `Nested modules are not supported: ${definition.id}`,
            );
        }
    }

    const circuit = CircuitLayout.from(definition.circuit, primitives);

    for (const port of definition.ports) {
        if (port.name.trim() === "") {
            throw new Error(`Module port name cannot be empty: ${port.id}`);
        }

        if ((port.layerOffset ?? 0) !== 0) {
            throw new Error(
                `Module ports must use the placement layer: ${port.id}`,
            );
        }

        const component = circuit.getComponentById(
            port.internalPort.componentId,
        );

        if (!component) {
            throw new Error(
                `Unknown internal component for modyle port: ${port.id}`,
            );
        }

        const internalDefinition = primitives.get(component.type);

        if (
            !internalDefinition.ports.some(
                (candidate) => candidate.id === port.internalPort.portId,
            )
        ) {
            throw new Error(
                `Unknown internal port for module port: ${port.id}`,
            );
        }
    }
}

function cloneModuleDefinition(definition: ModuleDefinition): ModuleDefinition {
    return {
        id: definition.id,
        name: definition.name,
        footprint: { ...definition.footprint },
        ports: definition.ports.map((port) => ({
            ...port,
            internalPort: { ...port.internalPort },
        })),
        circuit: {
            width: definition.circuit.width,
            height: definition.circuit.height,
            components: definition.circuit.components.map((component) => ({
                ...component,
                position: { ...component.position },
            })),
        },
        annotations: structuredClone(definition.annotations),
    };
}

export class ModuleCatalog implements ComponentCatalog {
    readonly modules: readonly ModuleDefinition[];
    readonly primitiveCatalog: ComponentCatalog;

    private readonly modulesById: ReadonlyMap<string, ModuleDefinition>;
    private readonly descriptorsByType: ReadonlyMap<
        string,
        ComponentDescriptor
    >;

    constructor(
        modules: readonly ModuleDefinition[],
        primitives: ComponentCatalog = defaultComponentRegistry,
    ) {
        this.primitiveCatalog = primitives;

        const modulesById = new Map<string, ModuleDefinition>();
        const descriptorsByType = new Map<string, ComponentDescriptor>();

        for (const source of modules) {
            if (modulesById.has(source.id)) {
                throw new Error(`Duplicate module id: ${source.id}`);
            }

            validateModuleDefinition(source, primitives);

            const definition = cloneModuleDefinition(source);
            const type = getModuleComponentType(definition.id);

            modulesById.set(definition.id, definition);
            descriptorsByType.set(type, {
                type,
                footprint: definition.footprint,
                ports: definition.ports,
            });
        }

        this.modules = [...modulesById.values()];
        this.modulesById = modulesById;
        this.descriptorsByType = descriptorsByType;
    }

    has(type: string): boolean {
        return type.startsWith(MODULE_TYPE_PREFIX)
            ? this.descriptorsByType.has(type)
            : this.primitiveCatalog.has(type);
    }

    get(type: string): ComponentDescriptor {
        if (type.startsWith(MODULE_TYPE_PREFIX)) {
            const descriptor = this.descriptorsByType.get(type);

            if (!descriptor) {
                throw new Error(`Unknown module: ${getModuleId(type) ?? type}`);
            }

            return descriptor;
        }

        return this.primitiveCatalog.get(type);
    }

    getModule(id: string): ModuleDefinition {
        const definition = this.modulesById.get(id);

        if (!definition) {
            throw new Error(`Unknown module: ${id}`);
        }

        return definition;
    }
}
