import { z } from "zod";

import { isRotation, type Rotation } from "../../circuit/placedComponent";

export const PROJECT_DOCUMENT_FORMAT = "cirkuit-project" as const;
export const PROJECT_DOCUMENT_VERSION = 2 as const;
export const PROJECT_ANNOTATION_COORDINATE_SPACE = "grid" as const;

const NonBlankStringSchema = z
    .string()
    .refine((value) => value.trim().length > 0, {
        message: "Must not be empty",
    });

const FiniteNumberSchema = z.number().finite();

const RotationSchema = z.custom<Rotation>(isRotation, {
    message: "Invalid rotation",
});

const ProjectPointV1Schema = z
    .object({
        x: FiniteNumberSchema,
        y: FiniteNumberSchema,
    })
    .strict();

const ProjectViewportV1Schema = z
    .object({
        x: FiniteNumberSchema,
        y: FiniteNumberSchema,
        zoom: FiniteNumberSchema.positive(),
    })
    .strict();

const ProjectGridPositionV1Schema = z
    .object({
        x: FiniteNumberSchema.int(),
        y: FiniteNumberSchema.int(),
    })
    .strict();

const ProjectComponentV1Schema = z
    .object({
        id: NonBlankStringSchema,
        type: NonBlankStringSchema,
        position: ProjectGridPositionV1Schema,
        rotation: RotationSchema,
    })
    .strict();

const ProjectLabelAnnotationV1Schema = z
    .object({
        id: NonBlankStringSchema,
        kind: z.literal("label"),
        position: ProjectPointV1Schema,
        text: z.string(),
    })
    .strict()
    .superRefine((annotation, context) => {
        if (annotation.text.trim().length === 0) {
            context.addIssue({
                code: "custom",
                path: ["text"],
                message: `Label annotation text cannot be empty: ${annotation.id}`,
            });
        }
    });

const ProjectLineAnnotationV1Schema = z
    .object({
        id: NonBlankStringSchema,
        kind: z.literal("line"),
        start: ProjectPointV1Schema,
        end: ProjectPointV1Schema,
    })
    .strict()
    .superRefine((annotation, context) => {
        if (
            annotation.start.x === annotation.end.x &&
            annotation.start.y === annotation.end.y
        ) {
            context.addIssue({
                code: "custom",
                path: ["end"],
                message: `Line annotation must have distinct endpoints: ${annotation.id}`,
            });
        }
    });

const ProjectRectangleAnnotationV1Schema = z
    .object({
        id: NonBlankStringSchema,
        kind: z.literal("rectangle"),
        position: ProjectPointV1Schema,
        width: FiniteNumberSchema,
        height: FiniteNumberSchema,
    })
    .strict()
    .superRefine((annotation, context) => {
        if (annotation.width <= 0 || annotation.height <= 0) {
            context.addIssue({
                code: "custom",
                message: `Rectangle annotation dimensions must be positive: ${annotation.id}`,
            });
        }
    });

export const ProjectAnnotationV1Schema = z.discriminatedUnion("kind", [
    ProjectLabelAnnotationV1Schema,
    ProjectLineAnnotationV1Schema,
    ProjectRectangleAnnotationV1Schema,
]);

const ProjectAnnotationsV1Schema = z
    .object({
        coordinateSpace: z.literal(PROJECT_ANNOTATION_COORDINATE_SPACE),
        items: z.array(ProjectAnnotationV1Schema),
    })
    .strict()
    .superRefine(({ items }, context) => {
        const ids = new Set<string>();

        items.forEach((annotation, index) => {
            if (ids.has(annotation.id)) {
                context.addIssue({
                    code: "custom",
                    path: ["items", index, "id"],
                    message: `Duplicate annotation id: ${annotation.id}`,
                });
            }

            ids.add(annotation.id);
        });
    });

export const ProjectDocumentV1Schema = z
    .object({
        format: z.literal(PROJECT_DOCUMENT_FORMAT),
        version: z.literal(1),

        viewport: ProjectViewportV1Schema,

        circuit: z
            .object({
                width: FiniteNumberSchema.int().positive(),
                height: FiniteNumberSchema.int().positive(),
                components: z.array(ProjectComponentV1Schema),
            })
            .strict(),

        annotations: ProjectAnnotationsV1Schema,
    })
    .strict();

export type ProjectPointV1 = z.infer<typeof ProjectPointV1Schema>;
export type ProjectComponentV1 = z.infer<typeof ProjectComponentV1Schema>;

export type ProjectLabelAnnotationV1 = z.infer<
    typeof ProjectLabelAnnotationV1Schema
>;

export type ProjectLineAnnotationV1 = z.infer<
    typeof ProjectLineAnnotationV1Schema
>;

export type ProjectRectangleAnnotationV1 = z.infer<
    typeof ProjectRectangleAnnotationV1Schema
>;

export type ProjectAnnotationV1 = z.infer<typeof ProjectAnnotationV1Schema>;

export type ProjectDocumentV1 = z.infer<typeof ProjectDocumentV1Schema>;

const ProjectComponentV2Schema = z
    .object({
        id: NonBlankStringSchema,
        type: NonBlankStringSchema,
        position: ProjectGridPositionV1Schema,
        rotation: RotationSchema,
        layer: z.union([z.literal(0), z.literal(1)]),
    })
    .strict();

export const ProjectDocumentV2Schema = z
    .object({
        format: z.literal(PROJECT_DOCUMENT_FORMAT),
        version: z.literal(PROJECT_DOCUMENT_VERSION),

        viewport: ProjectViewportV1Schema,

        circuit: z
            .object({
                width: FiniteNumberSchema.int().positive(),
                height: FiniteNumberSchema.int().positive(),
                components: z.array(ProjectComponentV2Schema),
            })
            .strict(),

        annotations: ProjectAnnotationsV1Schema,
    })
    .strict();

export type ProjectComponentV2 = z.infer<typeof ProjectComponentV2Schema>;

export type ProjectDocumentV2 = z.infer<typeof ProjectDocumentV2Schema>;

function formatIssuePath(path: readonly PropertyKey[]): string {
    return path.reduce<string>((result, part) => {
        if (typeof part === "number") {
            return `${result}[${part}]`;
        }

        const name = String(part);

        return result === "" ? name : `${result}.${name}`;
    }, "");
}

export function parseProjectDocumentValue(value: unknown): ProjectDocumentV2 {
    const versionResult = z
        .object({
            format: z.literal(PROJECT_DOCUMENT_FORMAT),
            version: z.number().int(),
        })
        .passthrough()
        .safeParse(value);

    if (!versionResult.success) {
        const [issue] = versionResult.error.issues;

        if (issue === undefined) {
            throw new Error("Invalid project document");
        }

        const path = formatIssuePath(issue.path);
        const location = path === "" ? "" : ` at ${path}`;

        throw new Error(
            `Invalid project document${location}: ${issue.message}`,
        );
    }

    if (versionResult.data.version === 1) {
        const result = ProjectDocumentV1Schema.safeParse(value);

        if (!result.success) {
            const [issue] = result.error.issues;

            if (issue === undefined) {
                throw new Error("Invalid project document");
            }

            const path = formatIssuePath(issue.path);
            const location = path === "" ? "" : ` at ${path}`;

            throw new Error(
                `Invalid project document${location}: ${issue.message}`,
            );
        }

        return {
            ...result.data,
            version: 2,
            circuit: {
                ...result.data.circuit,
                components: result.data.circuit.components.map((component) => ({
                    ...component,
                    layer: 0,
                })),
            },
        };
    }

    if (versionResult.data.version === 2) {
        const result = ProjectDocumentV2Schema.safeParse(value);

        if (result.success) {
            return result.data;
        }

        const [issue] = result.error.issues;

        if (issue === undefined) {
            throw new Error("Invalid project document");
        }

        const path = formatIssuePath(issue.path);
        const location = path === "" ? "" : ` at ${path}`;

        throw new Error(
            `Invalid project document${location}: ${issue.message}`,
        );
    }

    throw new Error(
        `Unsupported project document version: ${versionResult.data.version}`,
    );
}
