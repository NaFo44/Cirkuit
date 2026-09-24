import type { CanvasPoint } from "../grid/canvasPoint";

export type ShapeType = Exclude<AnnotationType, "label">;

interface BaseAnnotation {
    readonly id: string;
}

export interface LabelAnnotation extends BaseAnnotation {
    readonly kind: "label";
    readonly position: CanvasPoint;
    readonly text: string;
}

export interface LineAnnotation extends BaseAnnotation {
    readonly kind: "line";
    readonly start: CanvasPoint;
    readonly end: CanvasPoint;
}

export interface RectangleAnnotation extends BaseAnnotation {
    readonly kind: "rectangle";
    readonly position: CanvasPoint;
    readonly width: number;
    readonly height: number;
}

export type CircuitAnnotation =
    LabelAnnotation | LineAnnotation | RectangleAnnotation;

export type AnnotationType = CircuitAnnotation["kind"];
