import { useEffect, useRef, useState } from "react";
import {
    Minus,
    PenSquare,
    SquareDashedCursor,
    TextStartT,
} from "pixelarticons/react";

import type { AnnotationType } from "../../domain/project/circuitAnnotation";

interface AnnotationToolPickerProps {
    selectedType: AnnotationType | null;
    disabled: boolean;
    onSelect: (type: AnnotationType) => void;
}

const ANNOTATION_TOOLS = [
    {
        type: "label",
        label: "Label",
        icon: TextStartT,
    },
    {
        type: "line",
        label: "Line",
        icon: Minus,
    },
    {
        type: "rectangle",
        label: "Dashed rectangle",
        icon: SquareDashedCursor,
    },
] as const;

export function AnnotationToolPicker({
    selectedType,
    disabled,
    onSelect,
}: AnnotationToolPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !rootRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={rootRef} className="component-palette__annotation-picker">
            <div className={`tooltip ${isOpen ? "tooltip--menu-open" : ""}`}>
                <button
                    type="button"
                    className="component-palette__item component-palette__item--annotation"
                    aria-label="Annotations"
                    aria-pressed={selectedType !== null}
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((open) => !open)}
                    disabled={disabled}
                >
                    <PenSquare aria-hidden="true" />
                </button>

                <span className="tooltiptext">Annotations</span>
            </div>

            {isOpen && !disabled && (
                <div
                    className="component-palette__annotation-menu"
                    role="group"
                    aria-label="Annotation tools"
                >
                    {ANNOTATION_TOOLS.map(({ type, label, icon: Icon }) => (
                        <button
                            key={type}
                            type="button"
                            className="component-palette__item component-palette__item--annotation"
                            aria-label={label}
                            aria-pressed={selectedType === type}
                            title={label}
                            onClick={() => {
                                onSelect(type);
                                setIsOpen(false);
                            }}
                        >
                            <Icon aria-hidden="true" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
