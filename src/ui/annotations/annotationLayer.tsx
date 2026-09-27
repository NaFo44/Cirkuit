import { useRef } from "react";

import type {
    AnnotationType,
    CircuitAnnotation,
} from "../../domain/project/circuitAnnotation";
import "./annotationLayer.css";
import { useAnnotationEditor } from "./useAnnotationEditor";
import { AnnotationShapeLayer } from "./annotationShapeLayer";
import { AnnotationLabelLayer } from "./annotationLabelLayer";

interface AnnotationLayerProps {
    width: number;
    height: number;
    annotations: readonly CircuitAnnotation[];
    annotationTool: AnnotationType | null;
    onAdd: (annotation: CircuitAnnotation) => void;
    onUpdate: (annotation: CircuitAnnotation) => void;
    onRemove: (annotationId: string) => void;
}

export function AnnotationLayer({
    width,
    height,
    annotations,
    annotationTool,
    onAdd,
    onUpdate,
    onRemove,
}: AnnotationLayerProps) {
    const layerRef = useRef<HTMLDivElement>(null);

    const {
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
    } = useAnnotationEditor({
        width,
        height,
        annotations,
        annotationTool,
        onAdd,
        onUpdate,
        onRemove,
        layerRef,
    });

    return (
        <div
            ref={layerRef}
            className={`annotation-layer ${
                isEditable ? "annotation-layer--editable" : ""
            }`}
            data-tool={annotationTool ?? undefined}
            style={{ width, height }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handlePointerCancel}
        >
            <AnnotationShapeLayer
                width={width}
                height={height}
                annotations={annotations}
                draft={draft}
                draggedAnnotation={draggedAnnotation}
                selectedAnnotationId={selectedAnnotationId}
                isEditable={isEditable}
                onSelect={selectAnnotation}
            />

            <AnnotationLabelLayer
                annotations={annotations}
                draggedAnnotation={draggedAnnotation}
                selectedAnnotationId={selectedAnnotationId}
                isEditable={isEditable}
                labelEditor={labelEditor}
                setLabelEditor={setLabelEditor}
                commitLabel={commitLabel}
                onSelect={selectAnnotation}
                editLabel={editLabel}
                onKeyDown={handleKeyDown}
            />
        </div>
    );
}
