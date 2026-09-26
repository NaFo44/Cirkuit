import { afterEach, describe, expect, it, vi } from "vitest";

import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import type { CircuitProject } from "../../domain/project/circuitProject";
import { serializeProjectDocument } from "../../domain/project/serialization/projectDocument";
import {
    MAX_PROJECT_FILE_SIZE,
    downloadProjectFile,
    readProjectFile,
} from "./projectFile";

const PROJECT: CircuitProject = {
    viewport: {
        x: 0,
        y: 0,
        zoom: 1,
    },
    circuit: CircuitLayout.from({
        width: 2,
        height: 1,
        components: [
            {
                id: "source-1",
                type: "source",
                position: { x: 0, y: 0 },
                rotation: 0,
            },
            {
                id: "light-1",
                type: "light",
                position: { x: 1, y: 0 },
                rotation: 0,
            },
        ],
    }),

    annotations: [
        {
            id: "label-1",
            kind: "label",
            position: { x: 20, y: 20 },
            text: "Example",
        },
    ],
};

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("readProjectFile", () => {
    it("loads a valid project file", async () => {
        const contents = serializeProjectDocument(
            PROJECT,
            defaultComponentRegistry,
        );

        const file = new File([contents], "example.cirkuit", {
            type: "application/json",
        });

        const loadedProject = await readProjectFile(
            file,
            defaultComponentRegistry,
        );

        expect(loadedProject.circuit.width).toBe(PROJECT.circuit.width);

        expect(loadedProject.circuit.height).toBe(PROJECT.circuit.height);

        expect(loadedProject.circuit.components).toEqual(
            PROJECT.circuit.components,
        );

        expect(loadedProject.annotations).toEqual(PROJECT.annotations);
    });

    it("rejects files larger than the configured limit", async () => {
        const file = new File(
            [new Uint8Array(MAX_PROJECT_FILE_SIZE + 1)],
            "oversized.cirkuit",
        );

        await expect(
            readProjectFile(file, defaultComponentRegistry),
        ).rejects.toThrow("Project file is too large. Maximum size: 5 MB.");
    });

    it("accepts a file exactly at the configured size limit", async () => {
        const file = new File(
            [new Uint8Array(MAX_PROJECT_FILE_SIZE)],
            "invalid-but-correct-size.cirkuit",
        );

        await expect(
            readProjectFile(file, defaultComponentRegistry),
        ).rejects.toThrow("Project document is not valid JSON");
    });

    it("rejects invalid JSON contents", async () => {
        const file = new File(["{"], "invalid.cirkuit", {
            type: "application/json",
        });

        await expect(
            readProjectFile(file, defaultComponentRegistry),
        ).rejects.toThrow("Project document is not valid JSON");
    });
});

describe("downloadProjectFile", () => {
    it("downloads the serialized project with the default name", async () => {
        vi.useFakeTimers();

        const click = vi.fn();
        const remove = vi.fn();

        const link = {
            href: "",
            download: "",
            hidden: false,
            click,
            remove,
        };

        const createElement = vi.fn(() => link);
        const append = vi.fn();

        vi.stubGlobal("document", {
            createElement,
            body: {
                append,
            },
        });

        vi.stubGlobal("window", {
            setTimeout,
        });

        const createObjectURL = vi
            .spyOn(URL, "createObjectURL")
            .mockReturnValue("blob:cirkuit-project");

        const revokeObjectURL = vi
            .spyOn(URL, "revokeObjectURL")
            .mockImplementation(() => undefined);

        downloadProjectFile(PROJECT, defaultComponentRegistry);

        expect(createElement).toHaveBeenCalledWith("a");
        expect(append).toHaveBeenCalledWith(link);

        expect(link.href).toBe("blob:cirkuit-project");
        expect(link.download).toBe("cirkuit-project.cirkuit");
        expect(link.hidden).toBe(true);

        expect(click).toHaveBeenCalledOnce();
        expect(remove).toHaveBeenCalledOnce();

        const blob = createObjectURL.mock.calls[0]?.[0];

        expect(blob).toBeInstanceOf(Blob);

        expect(await (blob as Blob).text()).toBe(
            serializeProjectDocument(PROJECT, defaultComponentRegistry),
        );

        expect(revokeObjectURL).not.toHaveBeenCalled();

        vi.runAllTimers();

        expect(revokeObjectURL).toHaveBeenCalledOnce();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:cirkuit-project");
    });

    it("uses a provided file name", () => {
        vi.useFakeTimers();

        const link = {
            href: "",
            download: "",
            hidden: false,
            click: vi.fn(),
            remove: vi.fn(),
        };

        vi.stubGlobal("document", {
            createElement: vi.fn(() => link),
            body: {
                append: vi.fn(),
            },
        });

        vi.stubGlobal("window", {
            setTimeout,
        });

        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:custom-project");

        vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

        downloadProjectFile(
            PROJECT,
            defaultComponentRegistry,
            "xor-gate.cirkuit",
        );

        expect(link.download).toBe("xor-gate.cirkuit");

        vi.runAllTimers();
    });

    it("cleans up the link and URL when the click fails", () => {
        vi.useFakeTimers();

        const clickError = new Error("Download failed");

        const link = {
            href: "",
            download: "",
            hidden: false,
            click: vi.fn(() => {
                throw clickError;
            }),
            remove: vi.fn(),
        };

        vi.stubGlobal("document", {
            createElement: vi.fn(() => link),
            body: {
                append: vi.fn(),
            },
        });

        vi.stubGlobal("window", {
            setTimeout,
        });

        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:failed-project");

        const revokeObjectURL = vi
            .spyOn(URL, "revokeObjectURL")
            .mockImplementation(() => undefined);

        expect(() =>
            downloadProjectFile(PROJECT, defaultComponentRegistry),
        ).toThrow(clickError);

        expect(link.remove).toHaveBeenCalledOnce();

        vi.runAllTimers();

        expect(revokeObjectURL).toHaveBeenCalledWith("blob:failed-project");
    });
});
