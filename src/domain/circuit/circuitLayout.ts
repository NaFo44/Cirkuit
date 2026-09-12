import type { Position } from "../grid/position";
import type { Circuit } from "./circuit";
import type { PlacedComponent } from "./placedComponent";

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
        samePosition(first.position, second.position)
    );
}

export class CircuitLayout implements Circuit {
    readonly width: number;
    readonly height: number;
    readonly components: readonly PlacedComponent[];

    private readonly componentByPosition: ReadonlyMap<string, PlacedComponent>;

    private readonly componentById: ReadonlyMap<string, PlacedComponent>;

    private constructor(
        width: number,
        height: number,
        components: readonly PlacedComponent[],
    ) {
        this.width = width;
        this.height = height;
        this.components = [...components];

        this.componentByPosition = new Map(
            this.components.map((component) => [
                CircuitLayout.positionKey(component.position),
                component,
            ]),
        );

        this.componentById = new Map(
            this.components.map((component) => [component.id, component]),
        );
    }

    static empty(width: number, height: number): CircuitLayout {
        if (
            !Number.isInteger(width) ||
            !Number.isInteger(height) ||
            width <= 0 ||
            height <= 0
        ) {
            throw new Error("Layout dimensions must be positive integers");
        }

        return new CircuitLayout(width, height, []);
    }

    getComponentAt(position: Position): PlacedComponent | undefined {
        return this.componentByPosition.get(
            CircuitLayout.positionKey(position),
        );
    }

    withComponent(component: PlacedComponent): CircuitLayout {
        this.validateComponent(component);

        const existingById = this.componentById.get(component.id);
        const existingAtPosition = this.getComponentAt(component.position);

        if (existingById && existingById !== existingAtPosition) {
            throw new Error(
                `Component id is already used at another position: ${component.id}`,
            );
        }

        if (
            existingAtPosition &&
            sameComponent(existingAtPosition, component)
        ) {
            return this;
        }

        const components = this.components.filter(
            (existing) => existing !== existingAtPosition,
        );

        components.push(component);

        return new CircuitLayout(this.width, this.height, components);
    }

    withoutComponentAt(position: Position): CircuitLayout {
        const existing = this.getComponentAt(position);

        if (!existing) {
            return this;
        }

        return new CircuitLayout(
            this.width,
            this.height,
            this.components.filter((component) => component !== existing),
        );
    }

    private validateComponent(component: PlacedComponent): void {
        if (component.id.trim() === "") {
            throw new Error("Component id cannot be empty");
        }

        const { x, y } = component.position;

        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            throw new Error(
                `Component position must use integers: ${component.id}`,
            );
        }

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error(`Component is outside the layout: ${component.id}`);
        }
    }

    private static positionKey(position: Position): string {
        return JSON.stringify([position.x, position.y]);
    }
}
