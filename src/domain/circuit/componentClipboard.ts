import type { Position } from "../grid/position";
import { CircuitLayout } from "./circuitLayout";
import {
    getOccupiedLayers,
    type CircuitLayer,
    type Rotation,
} from "./placedComponent";

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

    const canPaste = pastedPlacements.every((component) => {
        const { x, y } = component.position;

        if (x < 0 || x >= circuit.width || y < 0 || y >= circuit.height) {
            return false;
        }

        return getOccupiedLayers(component).every(
            (layer) =>
                circuit.getComponentAt(component.position, layer) === undefined,
        );
    });

    if (!canPaste) {
        return null;
    }

    const pastedComponents = pastedPlacements.map((component) => ({
        id: createId(),
        ...component,
    }));

    return {
        circuit: CircuitLayout.from({
            width: circuit.width,
            height: circuit.height,
            components: [...circuit.components, ...pastedComponents],
        }),
        componentIds: new Set(
            pastedComponents.map((component) => component.id),
        ),
    };
}
