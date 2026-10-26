import type { Position } from "../grid/position";
import { CircuitLayout } from "./circuitLayout";
import type { CircuitLayer, Rotation } from "./placedComponent";

interface ClipboardComponent {
    readonly type: string;
    readonly rotation: Rotation;
    readonly layer: CircuitLayer;
    readonly offset: Position;
}

export interface ComponentClipboard {
    readonly components: readonly ClipboardComponent[];
}

export interface PasteResult {
    readonly circuit: CircuitLayout;
    readonly componentIds: ReadonlySet<string>;
}

type ComponentIdFactory = () => string;

export function createComponentClipboard(
    circuit: CircuitLayout,
    selectedComponentIds: ReadonlySet<string>,
): ComponentClipboard | null {
    const selectedComponents = circuit.components.filter((component) =>
        selectedComponentIds.has(component.id),
    );

    if (selectedComponents.length === 0) {
        return null;
    }

    const origin = {
        x: Math.min(
            ...selectedComponents.map((component) => component.position.x),
        ),
        y: Math.min(
            ...selectedComponents.map((component) => component.position.y),
        ),
    };

    return {
        components: selectedComponents.map((component) => ({
            type: component.type,
            rotation: component.rotation,
            layer: component.layer,
            offset: {
                x: component.position.x - origin.x,
                y: component.position.y - origin.y,
            },
        })),
    };
}

export function pasteComponentClipboard(
    circuit: CircuitLayout,
    clipboard: ComponentClipboard,
    position: Position,
    createId: ComponentIdFactory,
): PasteResult | null {
    const pastedPlacements = clipboard.components.map((component) => ({
        type: component.type,
        rotation: component.rotation,
        layer: component.layer,
        position: {
            x: position.x + component.offset.x,
            y: position.y + component.offset.y,
        },
    }));

    if (
        pastedPlacements.length === 0 ||
        !circuit.canPlaceComponents(pastedPlacements)
    ) {
        return null;
    }

    const pastedComponents = pastedPlacements.map((component) => ({
        id: createId(),
        ...component,
    }));

    return {
        circuit: CircuitLayout.from(
            {
                width: circuit.width,
                height: circuit.height,
                components: [...circuit.components, ...pastedComponents],
            },
            circuit.registry,
        ),
        componentIds: new Set(
            pastedComponents.map((component) => component.id),
        ),
    };
}

export function pasteComponentClipboardNearby(
    circuit: CircuitLayout,
    clipboard: ComponentClipboard,
    position: Position,
    createId: ComponentIdFactory,
): PasteResult | null {
    if (
        clipboard.components.length === 0 ||
        !Number.isInteger(position.x) ||
        !Number.isInteger(position.y) ||
        position.x < 0 ||
        position.y < 0 ||
        position.x >= circuit.width ||
        position.y >= circuit.height
    ) {
        return null;
    }

    for (
        let distance = 0;
        distance < circuit.width + circuit.height;
        distance++
    ) {
        for (let dx = distance; dx >= -distance; dx--) {
            const x = position.x + dx;

            if (x < 0 || x >= circuit.width) {
                continue;
            }

            const dy = distance - Math.abs(dx);
            const rows =
                dy === 0 ? [position.y] : [position.y + dy, position.y - dy];

            for (const y of rows) {
                if (y < 0 || y >= circuit.height) {
                    continue;
                }

                const result = pasteComponentClipboard(
                    circuit,
                    clipboard,
                    { x, y },
                    createId,
                );

                if (result) {
                    return result;
                }
            }
        }
    }

    return null;
}
