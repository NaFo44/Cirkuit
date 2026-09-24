import {
    useState,
    useEffect,
    type PointerEvent as ReactPointerEvent,
    type KeyboardEvent as ReactKeyboardEvent,
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

interface UseAnnotationEditorOptions {
    width: number;
    height: number;
    annotationTool: AnnotationType | null;
    onAdd: (annotation: CircuitAnnotation) => void;
    onUpdate: (annotation: CircuitAnnotation) => void;
    onRemove: (annotationId: string) => void;
}

export function useAnnotationEditor({
    width,
    height,
    annotationTool,
    onAdd,
    onUpdate,
    onRemove,
}: UseAnnotationEditorOptions) {
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<
        string | null
    >(null);
    const [draft, setDraft] = useState<ShapeDraft | null>(null);
    const [labelEditor, setLabelEditor] = useState<LabelEditorState | null>(
        null,
    );

    const isEditable = annotationTool !== null;

    const pointFromEvent = (
        event: ReactPointerEvent<HTMLDivElement>,
    ): CanvasPoint => {
        const bounds = event.currentTarget.getBoundingClientRect();

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
        if (!draft || draft.pointerId !== event.pointerId) {
            return;
        }

        const end = constrainEnd(
            draft.start,
            pointFromEvent(event),
            draft.kind,
            event.shiftKey,
        );

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        setDraft(null);

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
        event: ReactPointerEvent,
        annotationId: string,
    ) => {
        if (!isEditable) {
            return;
        }

        event.stopPropagation();
        setSelectedAnnotationId(annotationId);
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
    };

    return {
        isEditable,
        selectedAnnotationId,
        draft,
        labelEditor,
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
