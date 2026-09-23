import { useEffect, useRef } from "react";

import { TOGGLE_SIMULATION_SHORTCUT } from "./editorShortcuts";

type ToggleSimulation = () => void;

const INTERACTIVE_ELEMENT_SELECTOR = [
    "button",
    "a[href]",
    "input",
    "textarea",
    "select",
    "[contenteditable]:not([contenteditable='false'])",
].join(", ");

function isInteractiveElement(target: EventTarget | null): boolean {
    return (
        target instanceof Element &&
        target.closest(INTERACTIVE_ELEMENT_SELECTOR) !== null
    );
}

export function useToggleSimulationShortcut(onToggle: ToggleSimulation): void {
    const onToggleRef = useRef(onToggle);

    useEffect(() => {
        onToggleRef.current = onToggle;
    }, [onToggle]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.defaultPrevented ||
                event.code !== TOGGLE_SIMULATION_SHORTCUT ||
                event.repeat ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.shiftKey ||
                isInteractiveElement(event.target)
            ) {
                return;
            }

            event.preventDefault();
            onToggleRef.current();
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);
}
