import { describe, expect, it } from "vitest";

import { CircuitLayout } from "../../circuit/circuitLayout";
import { defaultComponentRegistry } from "../../circuit/components/builtInComponents";
import type { CircuitProject } from "../circuitProject";
import {
    PROJECT_ANNOTATION_COORDINATE_SPACE,
    PROJECT_DOCUMENT_FORMAT,
    PROJECT_DOCUMENT_VERSION,
    createProjectDocument,
    loadProjectDocument,
    parseProjectDocument,
    serializeProjectDocument,
    type ProjectDocumentV1,
} from "./projectDocument";

const PROJECT: CircuitProject = {
    circuit: CircuitLayout.from({
        width: 3,
        height: 1,
        components: [
            {
                id: "source-1",
                type: "source",
                position: { x: 0, y: 0 },
                rotation: 0,
            },
            {
                id: "wire-1",
                type: "wire",
                position: { x: 1, y: 0 },
                rotation: 0,
            },
            {
                id: "light-1",
                type: "light",
                position: { x: 2, y: 0 },
                rotation: 0,
            },
        ],
    }),

    annotations: [
        {
            id: "label-1",
            kind: "label",
            position: { x: 40, y: 20 },
            text: "Basic circuit",
        },
        {
            id: "line-1",
            kind: "line",
            start: { x: 0, y: 0 },
            end: { x: 60, y: 20 },
        },
        {
            id: "rectangle-1",
            kind: "rectangle",
            position: { x: 20, y: 40 },
            width: 80,
            height: 60,
        },
    ],
};

const VALID_DOCUMENT: ProjectDocumentV1 = {
    format: PROJECT_DOCUMENT_FORMAT,
    version: PROJECT_DOCUMENT_VERSION,

    circuit: {
        width: 3,
        height: 1,
        components: [
            {
                id: "source-1",
                type: "source",
                position: { x: 0, y: 0 },
                rotation: 0,
            },
            {
                id: "wire-1",
                type: "wire",
                position: { x: 1, y: 0 },
                rotation: 0,
            },
            {
                id: "light-1",
                type: "light",
                position: { x: 2, y: 0 },
                rotation: 0,
            },
        ],
    },

    annotations: {
        coordinateSpace: PROJECT_ANNOTATION_COORDINATE_SPACE,
        items: [
            {
                id: "label-1",
                kind: "label",
                position: { x: 2, y: 1 },
                text: "Basic circuit",
            },
            {
                id: "line-1",
                kind: "line",
                start: { x: 0, y: 0 },
                end: { x: 3, y: 1 },
            },
            {
                id: "rectangle-1",
                kind: "rectangle",
                position: { x: 1, y: 2 },
                width: 4,
                height: 3,
            },
        ],
    },
};

function documentWithComponents(components: readonly unknown[]): unknown {
    return {
        ...VALID_DOCUMENT,
        circuit: {
            ...VALID_DOCUMENT.circuit,
            components,
        },
    };
}

function documentWithAnnotations(items: readonly unknown[]): unknown {
    return {
        ...VALID_DOCUMENT,
        annotations: {
            ...VALID_DOCUMENT.annotations,
            items,
        },
    };
}

describe("projectDocument", () => {
    it("creates a serializable project document", () => {
        expect(
            createProjectDocument(PROJECT, defaultComponentRegistry),
        ).toEqual(VALID_DOCUMENT);
    });

    it("round-trips a project through JSON", () => {
        const json = serializeProjectDocument(
            PROJECT,
            defaultComponentRegistry,
        );

        const loaded = parseProjectDocument(json, defaultComponentRegistry);

        expect(loaded.circuit.width).toBe(PROJECT.circuit.width);
        expect(loaded.circuit.height).toBe(PROJECT.circuit.height);
        expect(loaded.circuit.components).toEqual(PROJECT.circuit.components);
        expect(loaded.annotations).toEqual(PROJECT.annotations);
    });

    it("rejects invalid JSON", () => {
        expect(() =>
            parseProjectDocument("{", defaultComponentRegistry),
        ).toThrow("Project document is not valid JSON");
    });

    it("rejects an unsupported project format", () => {
        expect(() =>
            loadProjectDocument(
                {
                    ...VALID_DOCUMENT,
                    format: "unknown-project",
                },
                defaultComponentRegistry,
            ),
        ).toThrow("Invalid project document at format");
    });

    it("rejects an unsupported version", () => {
        expect(() =>
            loadProjectDocument(
                {
                    ...VALID_DOCUMENT,
                    version: 2,
                },
                defaultComponentRegistry,
            ),
        ).toThrow("Invalid project document at version");
    });

    it("rejects an unsupported annotation coordinate space", () => {
        expect(() =>
            loadProjectDocument(
                {
                    ...VALID_DOCUMENT,
                    annotations: {
                        ...VALID_DOCUMENT.annotations,
                        coordinateSpace: "pixel",
                    },
                },
                defaultComponentRegistry,
            ),
        ).toThrow("Invalid project document at annotations.coordinateSpace");
    });

    it("rejects unknown component types", () => {
        expect(() =>
            loadProjectDocument(
                documentWithComponents([
                    {
                        id: "unknown-1",
                        type: "unknown",
                        position: { x: 0, y: 0 },
                        rotation: 0,
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow('Unknown component type "unknown" for component: unknown-1');
    });

    it("rejects invalid component rotations", () => {
        expect(() =>
            loadProjectDocument(
                documentWithComponents([
                    {
                        id: "source-1",
                        type: "source",
                        position: { x: 0, y: 0 },
                        rotation: 45,
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow("Invalid project document at circuit.components[0].rotation");
    });

    it("rejects components occupying the same position", () => {
        expect(() =>
            loadProjectDocument(
                documentWithComponents([
                    {
                        id: "source-1",
                        type: "source",
                        position: { x: 0, y: 0 },
                        rotation: 0,
                    },
                    {
                        id: "light-1",
                        type: "light",
                        position: { x: 0, y: 0 },
                        rotation: 0,
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow("Multiple components occupy position 0,0");
    });

    it("rejects unknown annotation kind", () => {
        expect(() =>
            loadProjectDocument(
                documentWithAnnotations([
                    {
                        id: "unknown-1",
                        kind: "circle",
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow("Invalid project document at annotations.items[0].kind");
    });

    it("rejects duplicate annotation ids", () => {
        expect(() =>
            loadProjectDocument(
                documentWithAnnotations([
                    VALID_DOCUMENT.annotations.items[0],
                    VALID_DOCUMENT.annotations.items[0],
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow("Duplicate annotation id: label-1");
    });

    it("rejects empty annotation ids", () => {
        expect(() =>
            loadProjectDocument(
                documentWithAnnotations([
                    {
                        id: " ",
                        kind: "label",
                        position: { x: 0, y: 0 },
                        text: "Label",
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow("Invalid project document at annotations.items[0].id");
    });

    it("rejects empty label text", () => {
        expect(() =>
            loadProjectDocument(
                documentWithAnnotations([
                    {
                        id: "label-1",
                        kind: "label",
                        position: { x: 0, y: 0 },
                        text: " ",
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow("Label annotation text cannot be empty: label-1");
    });

    it("rejects non-finite annotation coordinates", () => {
        expect(() =>
            loadProjectDocument(
                documentWithAnnotations([
                    {
                        id: "label-1",
                        kind: "label",
                        position: {
                            x: Number.POSITIVE_INFINITY,
                            y: 0,
                        },
                        text: "Label",
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow(
            "Invalid project document at annotations.items[0].position.x",
        );
    });

    it("rejects lines with identical endpoints", () => {
        expect(() =>
            loadProjectDocument(
                documentWithAnnotations([
                    {
                        id: "line-1",
                        kind: "line",
                        start: { x: 1, y: 1 },
                        end: { x: 1, y: 1 },
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow("Line annotation must have distinct endpoints: line-1");
    });

    it("rejects rectangles with non-positive dimensions", () => {
        expect(() =>
            loadProjectDocument(
                documentWithAnnotations([
                    {
                        id: "rectangle-1",
                        kind: "rectangle",
                        position: { x: 0, y: 0 },
                        width: 0,
                        height: 1,
                    },
                ]),
                defaultComponentRegistry,
            ),
        ).toThrow(
            "Rectangle annotation dimensions must be positive: rectangle-1",
        );
    });
});
