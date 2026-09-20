import { CircuitLayout } from "../../circuit/circuitLayout";
import type { ComponentRegistry } from "../../circuit/componentRegistry";
import type { CanvasPoint, CircuitAnnotation } from "../circuitAnnotation";
import type { CircuitProject } from "../circuitProject";
import { CELL_SIZE } from "../../grid/gridCoordinates";
import {
    PROJECT_ANNOTATION_COORDINATE_SPACE,
    PROJECT_DOCUMENT_FORMAT,
    PROJECT_DOCUMENT_VERSION,
    parseProjectDocumentValue,
    type ProjectAnnotationV1,
    type ProjectDocumentV1,
    type ProjectPointV1,
} from "./projectDocumentSchema";

export {
    PROJECT_ANNOTATION_COORDINATE_SPACE,
    PROJECT_DOCUMENT_FORMAT,
    PROJECT_DOCUMENT_VERSION,
    ProjectAnnotationV1Schema,
    ProjectDocumentV1Schema,
} from "./projectDocumentSchema";

export type {
    ProjectAnnotationV1,
    ProjectComponentV1,
    ProjectDocumentV1,
    ProjectLabelAnnotationV1,
    ProjectLineAnnotationV1,
    ProjectPointV1,
    ProjectRectangleAnnotationV1,
} from "./projectDocumentSchema";

function cellUnitsToCanvas(value: number, context: string): number {
    const result = value * CELL_SIZE;

    if (!Number.isFinite(result)) {
        throw new Error(`${context} is outside the supported range`);
    }

    return result;
}

function documentPointToCanvas(
    point: ProjectPointV1,
    context: string,
): CanvasPoint {
    return {
        x: cellUnitsToCanvas(point.x, `${context}.x`),
        y: cellUnitsToCanvas(point.y, `${context}.y`),
    };
}

function canvasPointToDocument(point: ProjectPointV1): CanvasPoint {
    return {
        x: point.x / CELL_SIZE,
        y: point.y / CELL_SIZE,
    };
}

function assertNever(value: never): never {
    throw new Error(`Unsupported annotation ${JSON.stringify(value)}`);
}

function createCircuitAnnotation(
    annotation: ProjectAnnotationV1,
): CircuitAnnotation {
    switch (annotation.kind) {
        case "label":
            return {
                id: annotation.id,
                kind: annotation.kind,
                position: documentPointToCanvas(
                    annotation.position,
                    `Label annotation position: ${annotation.id}`,
                ),
                text: annotation.text,
            };

        case "line":
            return {
                id: annotation.id,
                kind: annotation.kind,
                start: documentPointToCanvas(
                    annotation.start,
                    `Line annotation start: ${annotation.id}`,
                ),
                end: documentPointToCanvas(
                    annotation.end,
                    `Line annotation end: ${annotation.id}`,
                ),
            };

        case "rectangle":
            return {
                id: annotation.id,
                kind: annotation.kind,
                position: documentPointToCanvas(
                    annotation.position,
                    `Rectangle annotation position: ${annotation.id}`,
                ),
                width: cellUnitsToCanvas(
                    annotation.width,
                    `Rectangle annotation width: ${annotation.id}`,
                ),
                height: cellUnitsToCanvas(
                    annotation.height,
                    `Rectangle annotation height: ${annotation.id}`,
                ),
            };

        default:
            return assertNever(annotation);
    }
}

function createDocumentAnnotation(
    annotation: CircuitAnnotation,
): ProjectAnnotationV1 {
    switch (annotation.kind) {
        case "label":
            return {
                id: annotation.id,
                kind: annotation.kind,
                position: canvasPointToDocument(annotation.position),
                text: annotation.text,
            };

        case "line":
            return {
                id: annotation.id,
                kind: annotation.kind,
                start: canvasPointToDocument(annotation.start),
                end: canvasPointToDocument(annotation.end),
            };

        case "rectangle":
            return {
                id: annotation.id,
                kind: annotation.kind,
                position: canvasPointToDocument(annotation.position),
                width: annotation.width / CELL_SIZE,
                height: annotation.height / CELL_SIZE,
            };

        default:
            return assertNever(annotation);
    }
}

function validateComponentTypes(
    document: ProjectDocumentV1,
    registry: ComponentRegistry,
): void {
    for (const component of document.circuit.components) {
        if (!registry.has(component.type)) {
            throw new Error(
                `Unknown component type "${component.type}" for component: ${component.id}`,
            );
        }
    }
}

export function loadProjectDocument(
    value: unknown,
    registry: ComponentRegistry,
): CircuitProject {
    const document = parseProjectDocumentValue(value);

    validateComponentTypes(document, registry);

    const circuit = CircuitLayout.from({
        width: document.circuit.width,
        height: document.circuit.height,
        components: document.circuit.components,
    });

    return {
        circuit,
        annotations: document.annotations.items.map(createCircuitAnnotation),
    };
}

export function createProjectDocument(
    project: CircuitProject,
    registry: ComponentRegistry,
): ProjectDocumentV1 {
    const circuit = CircuitLayout.from(project.circuit);

    const document = {
        format: PROJECT_DOCUMENT_FORMAT,
        version: PROJECT_DOCUMENT_VERSION,

        circuit: {
            width: circuit.width,
            height: circuit.height,
            components: circuit.components.map((component) => ({
                id: component.id,
                type: component.type,
                position: {
                    x: component.position.x,
                    y: component.position.y,
                },
                rotation: component.rotation,
            })),
        },

        annotations: {
            coordinateSpace: PROJECT_ANNOTATION_COORDINATE_SPACE,
            items: project.annotations.map(createDocumentAnnotation),
        },
    } satisfies ProjectDocumentV1;

    // Generated documents follow the same validation as imported documents.
    loadProjectDocument(document, registry);

    return document;
}

export function serializeProjectDocument(
    project: CircuitProject,
    registry: ComponentRegistry,
): string {
    return JSON.stringify(createProjectDocument(project, registry), null, 2);
}

export function parseProjectDocument(
    json: string,
    registry: ComponentRegistry,
): CircuitProject {
    let value: unknown;

    try {
        value = JSON.parse(json) as unknown;
    } catch {
        throw new Error("Project document is not valid JSON");
    }

    return loadProjectDocument(value, registry);
}
