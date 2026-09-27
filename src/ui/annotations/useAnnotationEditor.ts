import {
    useState,
    useEffect,
    type PointerEvent as ReactPointerEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type RefObject,
} from "react";
import type {
    AnnotationType,
    CircuitAnnotation,
    LabelAnnotation,
    ShapeType,
} from "../../domain/project/circuitAnnotation";
import type { CanvasPoint } from "../../domain/grid/canvasPoint";
import {
    normalizeRectangle,
    constrainEnd,
    isLineTooSmall,
    isRectangleTooSmall,
} from "./annotationGeometry";
import { screenToCanvasPoint } from "../grid/canvasCoordinates";

const ANNOTATION_DRAG_THRESHOLD = 3;

function moveAnnotation(
    annotation: CircuitAnnotation,
    offset: CanvasPoint,
): CircuitAnnotation {
    if (annotation.kind === "line") {
        return {
            ...annotation,
            start: {
                x: annotation.start.x + offset.x,
                y: annotation.start.y + offset.y,
            },
            end: {
                x: annotation.end.x + offset.x,
                y: annotation.end.y + offset.y,
            },
        };
    }

    return {
        ...annotation,
        position: {
            x: annotation.position.x + offset.x,
            y: annotation.position.y + offset.y,
        },
    };
}

function createAnnotationId(): string {
    return crypto.randomUUID();
}

function isTextInput(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

export interface LabelEditorState {
    readonly id: string;
    readonly position: CanvasPoint;
    readonly isNew: boolean;
    readonly value: string;
}

export interface ShapeDraft {
    readonly kind: ShapeType;
    readonly pointerId: number;
    readonly start: CanvasPoint;
    readonly current: CanvasPoint;
}

interface AnnotationDrag {
    readonly pointerId: number;
    readonly annotation: CircuitAnnotation;
    readonly start: CanvasPoint;
    readonly current: CanvasPoint;
    readonly hasMoved: boolean;
}

interface UseAnnotationEditorOptions {
    width: number;
    height: number;
    annotations: readonly CircuitAnnotation[];
    annotationTool: AnnotationType | null;
    onAdd: (annotation: CircuitAnnotation) => void;
    onUpdate: (annotation: CircuitAnnotation) => void;
    onRemove: (annotationId: string) => void;
    layerRef: RefObject<HTMLDivElement | null>;
}

export function useAnnotationEditor({
    width,
    height,
    annotations,
    annotationTool,
    onAdd,
    onUpdate,
    onRemove,
    layerRef,
}: UseAnnotationEditorOptions) {
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<
        string | null
    >(null);
    const [draft, setDraft] = useState<ShapeDraft | null>(null);
    const [labelEditor, setLabelEditor] = useState<LabelEditorState | null>(
        null,
    );
    const [drag, setDrag] = useState<AnnotationDrag | null>(null);

    const isEditable = annotationTool !== null;

    const pointFromEvent = (event: ReactPointerEvent<Element>): CanvasPoint => {
        const layer = layerRef.current;

        if (!layer) {
            throw new Error("Annotation layer is not mounted");
        }

        const bounds = layer.getBoundingClientRect();

        return screenToCanvasPoint({
            width,
            height,
            clientX: event.clientX,
            clientY: event.clientY,
            bounds,
        });
    };

    const startLabel = (position: CanvasPoint) => {
        const id = createAnnotationId();

        setSelectedAnnotationId(null);
        setLabelEditor({
            id,
            position,
            isNew: true,
            value: "",
        });
    };

    const editLabel = (annotation: LabelAnnotation) => {
        setSelectedAnnotationId(annotation.id);
        setLabelEditor({
            id: annotation.id,
            position: annotation.position,
            isNew: false,
            value: annotation.text,
        });
    };

    const commitLabel = () => {
        if (!labelEditor) {
            return;
        }

        const text = labelEditor.value.trim();

        if (text === "") {
            if (!labelEditor.isNew) {
                onRemove(labelEditor.id);
            }

            setLabelEditor(null);
            setSelectedAnnotationId(null);
            return;
        }

        const annotation: LabelAnnotation = {
            id: labelEditor.id,
            kind: "label",
            position: labelEditor.position,
            text,
        };

        if (labelEditor.isNew) {
            onAdd(annotation);
        } else {
            onUpdate(annotation);
        }

        setSelectedAnnotationId(annotation.id);
        setLabelEditor(null);
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || annotationTool === null) {
            return;
        }

        event.preventDefault();

        const position = pointFromEvent(event);

        if (annotationTool === "label") {
            startLabel(position);
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        setSelectedAnnotationId(null);
        setDraft({
            kind: annotationTool,
            pointerId: event.pointerId,
            start: position,
            current: position,
        });
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (drag && drag.pointerId === event.pointerId) {
            const current = pointFromEvent(event);

            const deltaX = current.x - drag.start.x;
            const deltaY = current.y - drag.start.y;

            const hasMoved =
                Math.abs(deltaX) >= ANNOTATION_DRAG_THRESHOLD ||
                Math.abs(deltaY) >= ANNOTATION_DRAG_THRESHOLD;

            if (hasMoved && !drag.hasMoved) {
                layerRef.current?.setPointerCapture(event.pointerId);
                event.preventDefault();
            }

            setDrag({
                ...drag,
                current,
                hasMoved: drag.hasMoved || hasMoved,
            });

            return;
        }

        if (!draft || draft.pointerId !== event.pointerId) {
            return;
        }

        const current = constrainEnd(
            draft.start,
            pointFromEvent(event),
            draft.kind,
            event.shiftKey,
        );

        setDraft({
            ...draft,
            current,
        });
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (drag && drag.pointerId === event.pointerId) {
            const current = pointFromEvent(event);

            const offset = {
                x: current.x - drag.start.x,
                y: current.y - drag.start.y,
            };

            if (drag.hasMoved) {
                onUpdate(moveAnnotation(drag.annotation, offset));
            }

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }

            setDrag(null);

            return;
        }

        if (!draft || draft.pointerId !== event.pointerId) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        setDraft(null);

        const end = constrainEnd(
            draft.start,
            pointFromEvent(event),
            draft.kind,
            event.shiftKey,
        );

        const id = createAnnotationId();

        if (draft.kind === "line") {
            if (isLineTooSmall(draft.start, end)) {
                return;
            }

            onAdd({
                id,
                kind: "line",
                start: draft.start,
                end,
            });
        } else {
            const rectangle = normalizeRectangle(draft.start, end);

            if (isRectangleTooSmall(rectangle)) {
                return;
            }

            onAdd({
                id,
                kind: "rectangle",
                ...rectangle,
            });
        }

        setSelectedAnnotationId(id);
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            commitLabel();
        }

        if (event.key === "Escape") {
            event.preventDefault();
            setLabelEditor(null);
        }
    };

    const selectAnnotation = (
        event: ReactPointerEvent<Element>,
        annotationId: string,
    ) => {
        if (!isEditable) {
            return;
        }

        event.stopPropagation();

        const annotation = annotations.find(
            (currentAnnotation) => currentAnnotation.id === annotationId,
        );

        if (!annotation) {
            return;
        }

        setSelectedAnnotationId(annotationId);

        const position = pointFromEvent(event);

        setDrag({
            pointerId: event.pointerId,
            annotation,
            start: position,
            current: position,
            hasMoved: false,
        });
    };

    useEffect(() => {
        if (!isEditable || selectedAnnotationId === null) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                (event.key !== "Delete" && event.key !== "Backspace") ||
                isTextInput(event.target)
            ) {
                return;
            }

            event.preventDefault();
            onRemove(selectedAnnotationId);
            setSelectedAnnotationId(null);
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isEditable, onRemove, selectedAnnotationId]);

    const handlePointerCancel = () => {
        setDraft(null);
        setDrag(null);
    };

    const draggedAnnotation =
        drag === null
            ? null
            : moveAnnotation(drag.annotation, {
                  x: drag.current.x - drag.start.x,
                  y: drag.current.y - drag.start.y,
              });

    return {
        isEditable,
        selectedAnnotationId,
        draft,
        labelEditor,
        draggedAnnotation,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        handleKeyDown,
        selectAnnotation,
        editLabel,
        commitLabel,
        setLabelEditor,
    };
}
