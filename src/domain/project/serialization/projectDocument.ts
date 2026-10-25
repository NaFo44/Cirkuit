import { CircuitLayout } from "../../circuit/circuitLayout";
import type { ComponentRegistry } from "../../circuit/componentRegistry";
import type { CanvasPoint } from "../../grid/canvasPoint";
import type { CircuitAnnotation } from "../circuitAnnotation";
import type { CircuitProject } from "../circuitProject";
import { CELL_SIZE } from "../../grid/gridCoordinates";
import {
    PROJECT_ANNOTATION_COORDINATE_SPACE,
    PROJECT_DOCUMENT_FORMAT,
    PROJECT_DOCUMENT_VERSION,
    parseProjectDocumentValue,
    type ProjectAnnotationV1,
    type ProjectDocumentV3,
    type ProjectModuleV3,
    type ProjectPointV1,
} from "./projectDocumentSchema";
import { getComponentFootprint } from "../../circuit/componentGeometry";
import type { ModuleDefinition } from "../../circuit/modules/moduleDefinition";
import type { Circuit } from "../../circuit/circuit";
import type { ComponentCatalog } from "../../circuit/componentDefinition";
import { ModuleCatalog } from "../../circuit/modules/moduleCatalog";

export {
    PROJECT_ANNOTATION_COORDINATE_SPACE,
    PROJECT_DOCUMENT_FORMAT,
    PROJECT_DOCUMENT_VERSION,
    ProjectAnnotationV1Schema,
    ProjectDocumentV1Schema,
    ProjectDocumentV2Schema,
    ProjectDocumentV3Schema,
    ProjectModuleV3Schema,
    ProjectModulePortV3Schema,
} from "./projectDocumentSchema";

export type {
    ProjectAnnotationV1,
    ProjectComponentV1,
    ProjectComponentV2,
    ProjectDocumentV1,
    ProjectDocumentV2,
    ProjectLabelAnnotationV1,
    ProjectLineAnnotationV1,
    ProjectPointV1,
    ProjectRectangleAnnotationV1,
    ProjectDocumentV3,
    ProjectModuleV3,
    ProjectModulePortV3,
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

function canvasPointToDocument(point: CanvasPoint): ProjectPointV1 {
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

function validateDocumentCircuit(
    circuit: Circuit,
    registry: ComponentCatalog,
): void {
    for (const component of circuit.components) {
        if (!registry.has(component.type)) {
            throw new Error(
                `Unknown component type "${component.type}" for component: ${component.id}`,
            );
        }

        const { width, height } = getComponentFootprint(
            registry.get(component.type),
            component.rotation,
        );

        if (
            component.position.x < 0 ||
            component.position.y < 0 ||
            component.position.x + width > circuit.width ||
            component.position.y + height > circuit.height
        ) {
            throw new Error(`Component is outside the layout: ${component.id}`);
        }
    }
}

export function loadProjectDocument(
    value: unknown,
    registry: ComponentRegistry,
): CircuitProject {
    const document = parseProjectDocumentValue(value);

    const modules: ModuleDefinition[] = document.modules.map((definition) => ({
        id: definition.id,
        name: definition.name,
        footprint: definition.footprint,
        ports: definition.ports,
        circuit: definition.circuit,
        annotations: definition.annotations.items.map(createCircuitAnnotation),
    }));

    const moduleCatalog = new ModuleCatalog(modules, registry);
    const catalog = modules.length > 0 ? moduleCatalog : registry;

    validateDocumentCircuit(document.circuit, catalog);

    const circuit = CircuitLayout.from(
        {
            width: document.circuit.width,
            height: document.circuit.height,
            components: document.circuit.components,
        },
        catalog,
    );

    return {
        circuit,
        modules: moduleCatalog.modules,
        annotations: document.annotations.items.map(createCircuitAnnotation),
        viewport: {
            x: document.viewport.x,
            y: document.viewport.y,
            zoom: document.viewport.zoom,
        },
    };
}

function createDocumentCircuit(circuit: Circuit): ProjectDocumentV3["circuit"] {
    return {
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
            layer: component.layer,
        })),
    };
}

function createDocumentModule(definition: ModuleDefinition): ProjectModuleV3 {
    return {
        id: definition.id,
        name: definition.name,
        footprint: {
            width: definition.footprint.width,
            height: definition.footprint.height,
        },
        ports: definition.ports.map((port) => ({
            id: port.id,
            name: port.name,
            kind: port.kind,
            side: port.side,
            ...(port.offset === undefined ? {} : { offset: port.offset }),
            ...(port.layerOffset === undefined
                ? {}
                : { layerOffset: port.layerOffset }),
            internalPort: {
                componentId: port.internalPort.componentId,
                portId: port.internalPort.portId,
            },
        })),
        circuit: createDocumentCircuit(definition.circuit),
        annotations: {
            coordinateSpace: PROJECT_ANNOTATION_COORDINATE_SPACE,
            items: definition.annotations.map(createDocumentAnnotation),
        },
    };
}

export function createProjectDocument(
    project: CircuitProject,
    registry: ComponentRegistry,
): ProjectDocumentV3 {
    const document = {
        format: PROJECT_DOCUMENT_FORMAT,
        version: PROJECT_DOCUMENT_VERSION,

        viewport: {
            x: project.viewport.x,
            y: project.viewport.y,
            zoom: project.viewport.zoom,
        },

        circuit: createDocumentCircuit(project.circuit),
        modules: project.modules.map(createDocumentModule),

        annotations: {
            coordinateSpace: PROJECT_ANNOTATION_COORDINATE_SPACE,
            items: project.annotations.map(createDocumentAnnotation),
        },
    } satisfies ProjectDocumentV3;

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
