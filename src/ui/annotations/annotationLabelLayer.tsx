import type {
    CircuitAnnotation,
    LabelAnnotation,
} from "../../domain/project/circuitAnnotation";
import type { LabelEditorState } from "./useAnnotationEditor";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

interface AnnotationLabelProps {
    annotations: readonly CircuitAnnotation[];
    draggedAnnotation: CircuitAnnotation | null;
    selectedAnnotationId: string | null;
    isEditable: boolean;
    labelEditor: LabelEditorState | null;
    setLabelEditor: (
        value: React.SetStateAction<LabelEditorState | null>,
    ) => void;
    commitLabel: () => void;
    onSelect: (
        event: React.PointerEvent<Element>,
        annotationId: string,
    ) => void;
    editLabel: (annotation: LabelAnnotation) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}

export function AnnotationLabelLayer({
    annotations,
    draggedAnnotation,
    selectedAnnotationId,
    isEditable,
    labelEditor,
    setLabelEditor,
    commitLabel,
    onSelect,
    editLabel,
    onKeyDown,
}: AnnotationLabelProps) {
    return (
        <>
            {annotations.map((annotation) => {
                const renderedAnnotation =
                    annotation.id === draggedAnnotation?.id
                        ? draggedAnnotation
                        : annotation;

                if (renderedAnnotation.kind !== "label") {
                    return null;
                }

                return (
                    <button
                        key={annotation.id}
                        type="button"
                        className={`annotation-layer__label ${
                            isEditable && annotation.id === selectedAnnotationId
                                ? "annotation-layer__label--selected"
                                : ""
                        }`}
                        style={{
                            left: renderedAnnotation.position.x,
                            top: renderedAnnotation.position.y,
                        }}
                        tabIndex={isEditable ? 0 : -1}
                        onPointerDown={(event) =>
                            onSelect(event, annotation.id)
                        }
                        onDoubleClick={() => editLabel(renderedAnnotation)}
                    >
                        {renderedAnnotation.text}
                    </button>
                );
            })}

            {isEditable && labelEditor && (
                <input
                    autoFocus
                    className="annotation-layer__label-editor"
                    style={{
                        left: labelEditor.position.x,
                        top: labelEditor.position.y,
                    }}
                    value={labelEditor.value}
                    placeholder="Label"
                    aria-label="Annotation label"
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) =>
                        setLabelEditor((current) =>
                            current
                                ? {
                                      ...current,
                                      value: event.target.value,
                                  }
                                : null,
                        )
                    }
                    onBlur={commitLabel}
                    onKeyDown={onKeyDown}
                />
            )}
        </>
    );
}
