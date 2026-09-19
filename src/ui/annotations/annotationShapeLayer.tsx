import { normalizeRectangle } from "./annotationGeometry";
import type { CircuitAnnotation } from "../../domain/project/circuitAnnotation";
import type { ShapeDraft } from "./useAnnotationEditor";

interface AnnotationShapeProps {
    width: number;
    height: number;
    annotations: readonly CircuitAnnotation[];
    draft: ShapeDraft | null;
    selectedAnnotationId: string | null;
    isEditable: boolean;
    onSelect: (
        event: React.PointerEvent<SVGElement>,
        annotationId: string,
    ) => void;
}

export function AnnotationShapeLayer({
    width,
    height,
    annotations,
    draft,
    selectedAnnotationId,
    isEditable,
    onSelect,
}: AnnotationShapeProps) {
    return (
        <svg
            className="annotation-layer__svg"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
        >
            {annotations.map((annotation) => {
                if (annotation.kind === "label") {
                    return null;
                }

                const selected =
                    isEditable && annotation.id === selectedAnnotationId;

                if (annotation.kind === "line") {
                    return (
                        <g
                            key={annotation.id}
                            className={
                                selected
                                    ? "annotation-layer__shape annotation-layer__shape--selected"
                                    : "annotation-layer__shape"
                            }
                            onPointerDown={(event) =>
                                onSelect(event, annotation.id)
                            }
                        >
                            <line
                                className="annotation-layer__line"
                                x1={annotation.start.x}
                                y1={annotation.start.y}
                                x2={annotation.end.x}
                                y2={annotation.end.y}
                                vectorEffect="non-scaling-stroke"
                            />
                            <line
                                className="annotation-layer__hit-area"
                                x1={annotation.start.x}
                                y1={annotation.start.y}
                                x2={annotation.end.x}
                                y2={annotation.end.y}
                                vectorEffect="non-scaling-stroke"
                            />
                        </g>
                    );
                }

                return (
                    <g
                        key={annotation.id}
                        className={
                            selected
                                ? "annotation-layer__shape annotation-layer__shape--selected"
                                : "annotation-layer__shape"
                        }
                        onPointerDown={(event) =>
                            onSelect(event, annotation.id)
                        }
                    >
                        <rect
                            className="annotation-layer__rectangle"
                            x={annotation.position.x}
                            y={annotation.position.y}
                            width={annotation.width}
                            height={annotation.height}
                            vectorEffect="non-scaling-stroke"
                        />
                        <rect
                            className="annotation-layer__hit-area"
                            x={annotation.position.x}
                            y={annotation.position.y}
                            width={annotation.width}
                            height={annotation.height}
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                );
            })}

            {draft?.kind === "line" && (
                <line
                    className="annotation-layer__line annotation-layer__draft"
                    x1={draft.start.x}
                    y1={draft.start.y}
                    x2={draft.current.x}
                    y2={draft.current.y}
                    vectorEffect="non-scaling-stroke"
                />
            )}

            {draft?.kind === "rectangle" &&
                (() => {
                    const rectangle = normalizeRectangle(
                        draft.start,
                        draft.current,
                    );

                    return (
                        <rect
                            className="annotation-layer__rectangle annotation-layer__draft"
                            x={rectangle.position.x}
                            y={rectangle.position.y}
                            width={rectangle.width}
                            height={rectangle.height}
                            vectorEffect="non-scaling-stroke"
                        />
                    );
                })()}
        </svg>
    );
}
