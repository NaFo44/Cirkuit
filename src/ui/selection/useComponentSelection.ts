import { useCallback, useEffect, useRef, useState } from "react";

import {
    createComponentClipboard,
    pasteComponentClipboard,
    type ComponentClipboard,
} from "../../domain/circuit/componentClipboard";
import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import {
    canMoveComponents,
    moveComponents,
} from "../../domain/circuit/moveComponents";
import type { Position } from "../../domain/grid/position";
import {
    getComponentsInsideRectangle,
    type SelectionRectangle,
} from "./componentSelection";

interface UseComponentSelectionOptions {
    readonly enabled: boolean;
    readonly circuit: CircuitLayout;
    readonly getPastePosition: () => Position | null;
    readonly onCircuitChange: (circuit: CircuitLayout) => void;
}

interface ComponentSelection {
    readonly isSelectionModifierPressed: boolean;
    readonly selectedComponentIds: ReadonlySet<string>;

    readonly selectRectangle: (rectangle: SelectionRectangle) => void;
    readonly canMoveSelection: (offset: Position) => boolean;
    readonly moveSelection: (offset: Position) => void;

    readonly clearSelection: () => void;
    readonly resetSelectionState: () => void;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

export function useComponentSelection({
    enabled,
    circuit,
    getPastePosition,
    onCircuitChange,
}: UseComponentSelectionOptions): ComponentSelection {
    const [isSelectionModifierPressed, setIsSelectionModifierPressed] =
        useState(false);

    const [selectedComponentIds, setSelectedComponentIds] = useState<
        ReadonlySet<string>
    >(() => new Set());

    const clipboardRef = useRef<ComponentClipboard | null>(null);

    const clearSelection = useCallback(() => {
        setSelectedComponentIds((currentSelection) =>
            currentSelection.size === 0 ? currentSelection : new Set(),
        );
    }, []);

    const resetSelectionState = useCallback(() => {
        clipboardRef.current = null;
        clearSelection();
    }, [clearSelection]);

    const selectRectangle = useCallback(
        (rectangle: SelectionRectangle) => {
            setSelectedComponentIds(
                getComponentsInsideRectangle(circuit.components, rectangle),
            );
        },
        [circuit],
    );

    const canMoveSelection = useCallback(
        (offset: Position) =>
            enabled && canMoveComponents(circuit, selectedComponentIds, offset),
        [circuit, enabled, selectedComponentIds],
    );

    const moveSelection = useCallback(
        (offset: Position) => {
            if (!enabled) {
                return;
            }

            const nextCircuit = moveComponents(
                circuit,
                selectedComponentIds,
                offset,
            );

            if (nextCircuit && nextCircuit !== circuit) {
                onCircuitChange(nextCircuit);
            }
        },
        [circuit, enabled, onCircuitChange, selectedComponentIds],
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isSelectionModifier =
                event.code === "KeyS" &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                !isTextEditingTarget(event.target);

            if (!enabled || !isSelectionModifier || event.repeat) {
                return;
            }

            event.preventDefault();
            setIsSelectionModifierPressed(true);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "KeyS") {
                setIsSelectionModifierPressed(false);
            }
        };

        const handleWindowBlur = () => {
            setIsSelectionModifierPressed(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [enabled]);

    useEffect(() => {
        const handleClipboardShortcut = (event: KeyboardEvent) => {
            if (
                !enabled ||
                event.defaultPrevented ||
                event.repeat ||
                event.altKey ||
                event.shiftKey ||
                (!event.ctrlKey && !event.metaKey) ||
                isTextEditingTarget(event.target)
            ) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key === "c") {
                const clipboard = createComponentClipboard(
                    circuit,
                    selectedComponentIds,
                );

                if (!clipboard) {
                    return;
                }

                event.preventDefault();
                clipboardRef.current = clipboard;
                return;
            }

            if (key !== "v" || !clipboardRef.current) {
                return;
            }

            const pastePosition = getPastePosition();

            if (!pastePosition) {
                return;
            }

            event.preventDefault();

            const result = pasteComponentClipboard(
                circuit,
                clipboardRef.current,
                pastePosition,
                () => crypto.randomUUID(),
            );

            if (!result) {
                return;
            }

            onCircuitChange(result.circuit);
            setSelectedComponentIds(result.componentIds);
        };

        window.addEventListener("keydown", handleClipboardShortcut);

        return () => {
            window.removeEventListener("keydown", handleClipboardShortcut);
        };
    }, [
        circuit,
        enabled,
        getPastePosition,
        onCircuitChange,
        selectedComponentIds,
    ]);

    return {
        isSelectionModifierPressed,
        selectedComponentIds,
        selectRectangle,
        canMoveSelection,
        moveSelection,
        clearSelection,
        resetSelectionState,
    };
}
