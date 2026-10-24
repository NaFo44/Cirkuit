import { positionKey, type Position } from "../grid/position";
import type { Circuit } from "./circuit";
import { getComponentFootprint, getOccupiedCells } from "./componentGeometry";
import type { ComponentRegistry } from "./componentRegistry";
import { defaultComponentRegistry } from "./components/builtInComponents";
import {
    isCircuitLayer,
    isRotation,
    type CircuitLayer,
    type ComponentPlacement,
    type PlacedComponent,
} from "./placedComponent";

function samePosition(first: Position, second: Position): boolean {
    return first.x === second.x && first.y === second.y;
}

function sameComponent(
    first: PlacedComponent,
    second: PlacedComponent,
): boolean {
    return (
        first.id === second.id &&
        first.type === second.type &&
        first.rotation === second.rotation &&
        first.layer === second.layer &&
        samePosition(first.position, second.position)
    );
}

function positionLayerKey(position: Position, layer: CircuitLayer): string {
    return `${layer}:${positionKey(position)}`;
}

export class CircuitLayout implements Circuit {
    readonly width: number;
    readonly height: number;
    readonly components: readonly PlacedComponent[];
    readonly registry: ComponentRegistry;

    private readonly componentByPosition: ReadonlyMap<string, PlacedComponent>;

    private readonly componentById: ReadonlyMap<string, PlacedComponent>;

    private constructor(
        width: number,
        height: number,
        components: readonly PlacedComponent[],
        registry: ComponentRegistry,
    ) {
        this.width = width;
        this.height = height;
        this.components = [...components];
        this.registry = registry;

        const componentByPosition = new Map<string, PlacedComponent>();

        for (const component of this.components) {
            for (const { position, layer } of this.getOccupiedCells(
                component,
            )) {
                componentByPosition.set(
                    positionLayerKey(position, layer),
                    component,
                );
            }
        }

        this.componentByPosition = componentByPosition;

        this.componentById = new Map(
            this.components.map((component) => [component.id, component]),
        );
    }

    static empty(
        width: number,
        height: number,
        registry: ComponentRegistry = defaultComponentRegistry,
    ): CircuitLayout {
        if (
            !Number.isInteger(width) ||
            !Number.isInteger(height) ||
            width <= 0 ||
            height <= 0
        ) {
            throw new Error("Layout dimensions must be positive integers");
        }

        return new CircuitLayout(width, height, [], registry);
    }

    static from(
        circuit: Circuit,
        registry: ComponentRegistry = circuit instanceof CircuitLayout
            ? circuit.registry
            : defaultComponentRegistry,
    ): CircuitLayout {
        const layout = CircuitLayout.empty(
            circuit.width,
            circuit.height,
            registry,
        );
        const componentIds = new Set<string>();
        const occupiedPositions = new Set<string>();

        for (const component of circuit.components) {
            layout.validateComponent(component);

            if (componentIds.has(component.id)) {
                throw new Error(`Duplicate component id: ${component.id}`);
            }

            componentIds.add(component.id);

            for (const { position, layer } of layout.getOccupiedCells(
                component,
            )) {
                const key = positionLayerKey(position, layer);

                if (occupiedPositions.has(key)) {
                    throw new Error(
                        `Multiple components occupy position ${positionKey(position)} on layer ${layer}`,
                    );
                }

                occupiedPositions.add(key);
            }
        }

        return new CircuitLayout(
            circuit.width,
            circuit.height,
            circuit.components,
            registry,
        );
    }

    getComponentAt(
        position: Position,
        layer: CircuitLayer = 0,
    ): PlacedComponent | undefined {
        return this.componentByPosition.get(positionLayerKey(position, layer));
    }

    getOccupiedCells(component: ComponentPlacement) {
        return getOccupiedCells(component, this.registry.get(component.type));
    }

    canPlaceComponents(
        components: readonly ComponentPlacement[],
        ignoredComponentIds: ReadonlySet<string> = new Set(),
    ): boolean {
        const occupiedPositions = new Set<string>();

        for (const component of components) {
            if (
                !this.registry.has(component.type) ||
                !isRotation(component.rotation) ||
                !isCircuitLayer(component.layer) ||
                !Number.isInteger(component.position.x) ||
                !Number.isInteger(component.position.y)
            ) {
                return false;
            }

            for (const { position, layer } of this.getOccupiedCells(
                component,
            )) {
                if (
                    position.x < 0 ||
                    position.x >= this.width ||
                    position.y < 0 ||
                    position.y >= this.height
                ) {
                    return false;
                }

                const key = positionLayerKey(position, layer);
                const existing = this.getComponentAt(position, layer);

                if (
                    occupiedPositions.has(key) ||
                    (existing && !ignoredComponentIds.has(existing.id))
                ) {
                    return false;
                }

                occupiedPositions.add(key);
            }
        }

        return true;
    }

    withComponent(component: PlacedComponent): CircuitLayout {
        this.validateComponent(component);

        const existingById = this.componentById.get(component.id);

        if (
            existingById &&
            !samePosition(existingById.position, component.position)
        ) {
            throw new Error(
                `Component id is already used at another position: ${component.id}`,
            );
        }

        if (existingById && sameComponent(existingById, component)) {
            return this;
        }

        const componentsToRemove = new Set<string>();

        if (existingById) {
            componentsToRemove.add(existingById.id);
        }

        for (const { position, layer } of this.getOccupiedCells(component)) {
            const existing = this.getComponentAt(position, layer);

            if (!existing || existing.id === component.id) {
                continue;
            }

            if (!this.isSingleCell(component) || !this.isSingleCell(existing)) {
                return this;
            }

            componentsToRemove.add(existing.id);
        }

        const components = this.components.filter(
            (existing) => !componentsToRemove.has(existing.id),
        );

        return new CircuitLayout(
            this.width,
            this.height,
            [...components, component],
            this.registry,
        );
    }

    withoutComponentAt(
        position: Position,
        layer: CircuitLayer = 0,
    ): CircuitLayout {
        const existing = this.getComponentAt(position, layer);

        if (!existing) {
            return this;
        }

        return new CircuitLayout(
            this.width,
            this.height,
            this.components.filter((component) => component !== existing),
            this.registry,
        );
    }

    withoutComponents(componentIds: ReadonlySet<string>): CircuitLayout {
        if (componentIds.size === 0) {
            return this;
        }

        const components = this.components.filter(
            (component) => !componentIds.has(component.id),
        );

        if (components.length === this.components.length) {
            return this;
        }

        return new CircuitLayout(
            this.width,
            this.height,
            components,
            this.registry,
        );
    }

    getComponentById(id: string): PlacedComponent | undefined {
        return this.componentById.get(id);
    }

    private isSingleCell(component: ComponentPlacement): boolean {
        const { width, height } = getComponentFootprint(
            this.registry.get(component.type),
            component.rotation,
        );

        return width === 1 && height === 1;
    }

    private validateComponent(component: PlacedComponent): void {
        if (component.id.trim() === "") {
            throw new Error("Component id cannot be empty");
        }

        if (component.type.trim() === "") {
            throw new Error(`Component type cannot be empty: ${component.id}`);
        }

        if (!isRotation(component.rotation)) {
            throw new Error(`Invalid component rotation: ${component.id}`);
        }

        if (!isCircuitLayer(component.layer)) {
            throw new Error(`Invalid component layer: ${component.id}`);
        }

        const { x, y } = component.position;

        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            throw new Error(
                `Component position must use integers: ${component.id}`,
            );
        }

        for (const { position } of this.getOccupiedCells(component)) {
            if (
                position.x < 0 ||
                position.x >= this.width ||
                position.y < 0 ||
                position.y >= this.height
            ) {
                throw new Error(
                    `Component is outside the layout: ${component.id}`,
                );
            }
        }
    }
}
