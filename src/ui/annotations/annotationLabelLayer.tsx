import type {
    CircuitAnnotation,
    LabelAnnotation,
} from "../../domain/project/circuitAnnotation";
import type { LabelEditorState } from "./useAnnotationEditor";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

interface AnnotationLabelProps {
    annotations: readonly CircuitAnnotation[];
    selectedAnnotationId: string | null;
    isEditable: boolean;
    labelEditor: LabelEditorState | null;
    setLabelEditor: (
        value: React.SetStateAction<LabelEditorState | null>,
    ) => void;
    commitLabel: () => void;
    onSelect: (
        event: React.PointerEvent<HTMLButtonElement>,
        annotationId: string,
    ) => void;
    editLabel: (annotation: LabelAnnotation) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}

export function AnnotationLabelLayer({
    annotations,
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
            {annotations.map((annotation) =>
                annotation.kind === "label" ? (
                    <button
                        key={annotation.id}
                        type="button"
                        className={`annotation-layer__label ${
                            isEditable && annotation.id === selectedAnnotationId
                                ? "annotation-layer__label--selected"
                                : ""
                        }`}
                        style={{
                            left: annotation.position.x,
                            top: annotation.position.y,
                        }}
                        tabIndex={isEditable ? 0 : -1}
                        onPointerDown={(event) =>
                            onSelect(event, annotation.id)
                        }
                        onDoubleClick={() => editLabel(annotation)}
                    >
                        {annotation.text}
                    </button>
                ) : null,
            )}

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
