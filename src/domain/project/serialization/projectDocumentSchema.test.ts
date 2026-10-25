import { describe, expect, it } from "vitest";

import { createTestDocumentV3 } from "../../../test/projectDocumentFixtures";
import {
    PROJECT_DOCUMENT_VERSION,
    ProjectDocumentV2Schema,
    parseProjectDocumentValue,
} from "./projectDocumentSchema";

function legacyDocument(version: 1 | 2) {
    return {
        format: "cirkuit-project",
        version,
        viewport: { x: 10, y: 20, zoom: 2 },
        circuit: {
            width: 4,
            height: 4,
            components: [
                {
                    id: "wire-1",
                    type: "wire",
                    position: { x: 1, y: 1 },
                    rotation: 90,
                    ...(version === 2 ? { layer: 1 } : {}),
                },
            ],
        },
        annotations: { coordinateSpace: "grid", items: [] },
    };
}

describe("project document version migration", () => {
    it("uses v3 as the current format while keeping the v2 schema fixed", () => {
        expect(PROJECT_DOCUMENT_VERSION).toBe(3);
        const legacy = legacyDocument(2);
        expect(ProjectDocumentV2Schema.safeParse(legacy).success).toBe(true);
        expect(
            ProjectDocumentV2Schema.safeParse({ ...legacy, version: 3 })
                .success,
        ).toBe(false);
    });

    it("migrates v1 to v3 with layer zero and an empty module library", () => {
        const legacy = legacyDocument(1);
        const before = structuredClone(legacy);
        const document = parseProjectDocumentValue(legacy);

        expect(document.version).toBe(3);
        expect(document.modules).toEqual([]);
        expect(document.circuit.components[0]).toMatchObject({
            id: "wire-1",
            rotation: 90,
            layer: 0,
        });
        expect(document.viewport).toEqual(legacy.viewport);
        expect(document.annotations).toEqual(legacy.annotations);
        expect(legacy).toEqual(before);
    });

    it("migrates v2 without changing component layers", () => {
        const legacy = legacyDocument(2);
        const document = parseProjectDocumentValue(legacy);
        expect(document.version).toBe(3);
        expect(document.modules).toEqual([]);
        expect(document.circuit).toEqual(legacy.circuit);
    });

    it("parses v3 definitions without mutating the input", () => {
        const document = createTestDocumentV3();
        const before = structuredClone(document);
        expect(parseProjectDocumentValue(document)).toEqual(document);
        expect(document).toEqual(before);
    });

    it("requires an explicit library in v3", () => {
        const { format, version, viewport, circuit, annotations } =
            createTestDocumentV3();
        expect(() =>
            parseProjectDocumentValue({
                format,
                version,
                viewport,
                circuit,
                annotations,
            }),
        ).toThrow("Invalid project document at modules");
    });

    it.each([1, 2] as const)(
        "rejects a library inserted into legacy version %i",
        (version) => {
            expect(() =>
                parseProjectDocumentValue({
                    ...legacyDocument(version),
                    modules: [],
                }),
            ).toThrow("Invalid project document");
        },
    );

    it.each([0, 4, 99])("rejects unsupported version %i", (version) => {
        expect(() =>
            parseProjectDocumentValue({
                ...createTestDocumentV3(),
                version,
            }),
        ).toThrow(`Unsupported project document version: ${version}`);
    });
});

describe("v3 module document schemas", () => {
    it.each(["inout", "passive"] as const)("accepts %s ports", (kind) => {
        const document = createTestDocumentV3();
        document.modules[0].ports[0].kind = kind;
        expect(
            parseProjectDocumentValue(document).modules[0].ports[0].kind,
        ).toBe(kind);
    });

    it("accepts an omitted port offset", () => {
        const document = createTestDocumentV3();
        delete document.modules[0].ports[0].offset;
        expect(
            parseProjectDocumentValue(document).modules[0].ports[0].offset,
        ).toBeUndefined();
    });

    it.each([-1, 0.5, Number.POSITIVE_INFINITY])(
        "rejects invalid port offset %s",
        (offset) => {
            const document = createTestDocumentV3();
            document.modules[0].ports[0].offset = offset;
            expect(() => parseProjectDocumentValue(document)).toThrow(
                "modules[0].ports[0].offset",
            );
        },
    );

    it("rejects ports on the opposite placement layer", () => {
        const document = createTestDocumentV3();
        const invalid = {
            ...document,
            modules: [
                {
                    ...document.modules[0],
                    ports: [
                        { ...document.modules[0].ports[0], layerOffset: 1 },
                    ],
                },
            ],
        };
        expect(() => parseProjectDocumentValue(invalid)).toThrow(
            "modules[0].ports[0].layerOffset",
        );
    });

    it.each([0, -1, 1.5, Number.POSITIVE_INFINITY])(
        "rejects invalid footprint width %s",
        (width) => {
            const document = createTestDocumentV3();
            document.modules[0].footprint.width = width;
            expect(() => parseProjectDocumentValue(document)).toThrow(
                "modules[0].footprint.width",
            );
        },
    );

    it("rejects unknown fields instead of accepting serialized behavior", () => {
        const document = createTestDocumentV3();
        expect(() =>
            parseProjectDocumentValue({
                ...document,
                modules: [
                    { ...document.modules[0], computeOutputs: "function" },
                ],
            }),
        ).toThrow("Invalid project document at modules[0]");
    });

    it("rejects empty internal references", () => {
        const document = createTestDocumentV3();
        document.modules[0].ports[0].internalPort.componentId = " ";
        expect(() => parseProjectDocumentValue(document)).toThrow(
            "modules[0].ports[0].internalPort.componentId",
        );
    });

    it("validates the coordinate space of internal annotations", () => {
        const document = createTestDocumentV3();
        expect(() =>
            parseProjectDocumentValue({
                ...document,
                modules: [
                    {
                        ...document.modules[0],
                        annotations: { coordinateSpace: "pixel", items: [] },
                    },
                ],
            }),
        ).toThrow("modules[0].annotations.coordinateSpace");
    });

    it("rejects duplicate internal annotation ids", () => {
        const document = createTestDocumentV3();
        const annotation = {
            id: "label",
            kind: "label" as const,
            position: { x: 0, y: 0 },
            text: "Label",
        };
        document.modules[0].annotations.items = [annotation, annotation];
        expect(() => parseProjectDocumentValue(document)).toThrow(
            "Duplicate annotation id: label",
        );
    });
});
