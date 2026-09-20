import type { ComponentRegistry } from "../../domain/circuit/componentRegistry";
import type { CircuitProject } from "../../domain/project/circuitProject";
import {
    parseProjectDocument,
    serializeProjectDocument,
} from "../../domain/project/serialization/projectDocument";

export const PROJECT_FILE_ACCEPT = ".cirkuit,.json,application/json";

const MAX_PROJECT_FILE_SIZE_MB = 5;

export const MAX_PROJECT_FILE_SIZE = MAX_PROJECT_FILE_SIZE_MB * 1024 * 1024;

const DEFAULT_PROJECT_FILE_NAME = "cirkuit-project.cirkuit";
const PROJECT_FILE_MIME_TYPE = "application/json;charset=utf-8";

function assertProjectFileSize(file: File): void {
    if (file.size > MAX_PROJECT_FILE_SIZE) {
        throw new Error(
            `Project file is too large. Maximum size: ${MAX_PROJECT_FILE_SIZE_MB} MB.`,
        );
    }
}

export async function readProjectFile(
    file: File,
    registry: ComponentRegistry,
): Promise<CircuitProject> {
    assertProjectFileSize(file);

    const contents = await file.text();

    return parseProjectDocument(contents, registry);
}

export function downloadProjectFile(
    project: CircuitProject,
    registry: ComponentRegistry,
    fileName = DEFAULT_PROJECT_FILE_NAME,
): void {
    const contents = serializeProjectDocument(project, registry);

    const blob = new Blob([contents], {
        type: PROJECT_FILE_MIME_TYPE,
    });

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = fileName;
    link.hidden = true;

    document.body.append(link);

    try {
        link.click();
    } finally {
        link.remove();

        window.setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
        }, 0);
    }
}
