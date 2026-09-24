import { positionKey, type Position } from "../grid/position";
import { CircuitLayout } from "./circuitLayout";
import type { Rotation } from "./placedComponent";

interface ClipboardComponent {
    readonly type: string;
    readonly rotation: Rotation;
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
    const occupiedPositions = new Set(
        circuit.components.map((component) => positionKey(component.position)),
    );

    const pastedPositions = clipboard.components.map((component) => ({
        x: position.x + component.offset.x,
        y: position.y + component.offset.y,
    }));

    const canPaste = pastedPositions.every(
        (componentPosition) =>
            componentPosition.x >= 0 &&
            componentPosition.x < circuit.width &&
            componentPosition.y >= 0 &&
            componentPosition.y < circuit.height &&
            !occupiedPositions.has(positionKey(componentPosition)),
    );

    if (!canPaste) {
        return null;
    }

    const pastedComponents = clipboard.components.map((component, index) => ({
        id: createId(),
        type: component.type,
        rotation: component.rotation,
        position: pastedPositions[index],
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
