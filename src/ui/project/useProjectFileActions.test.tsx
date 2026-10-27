// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestModule, createTestProject } from "../../test/moduleFixtures";
import { defaultComponentRegistry } from "../../domain/circuit/components/builtInComponents";
import { readProjectFile } from "./projectFile";
import { useProjectFileActions } from "./useProjectFileActions";

vi.mock("./projectFile", () => ({
    readProjectFile: vi.fn(),
    downloadProjectFile: vi.fn(),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type FileActions = ReturnType<typeof useProjectFileActions>;

describe("project replacement", () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.restoreAllMocks();
    });

    it.each([
        { hasContent: true, confirmed: false, expectedOpen: false },
        { hasContent: true, confirmed: true, expectedOpen: true },
        { hasContent: false, confirmed: false, expectedOpen: true },
    ])(
        "asks before replacing a populated project with %j",
        async ({ hasContent, confirmed, expectedOpen }) => {
            const project = {
                ...createTestProject(),
                modules: hasContent ? [createTestModule()] : [],
            };
            const imported = createTestProject();
            vi.mocked(readProjectFile).mockResolvedValue(imported);
            const confirm = vi
                .spyOn(window, "confirm")
                .mockReturnValue(confirmed);
            const onProjectOpen = vi.fn();
            let actions!: FileActions;

            function Probe() {
                const value = useProjectFileActions({
                    project,
                    registry: defaultComponentRegistry,
                    onProjectOpen,
                    getViewport: () => project.viewport,
                });
                useLayoutEffect(() => {
                    actions = value;
                }, [value]);
                return null;
            }

            act(() => root.render(<Probe />));
            await act(() =>
                actions.openProject(new File(["{}"], "project.cirkuit")),
            );

            expect(confirm).toHaveBeenCalledTimes(hasContent ? 1 : 0);
            if (hasContent) {
                expect(confirm).toHaveBeenCalledWith(
                    "Replace the current circuit with the selected project?",
                );
            }
            expect(onProjectOpen).toHaveBeenCalledTimes(expectedOpen ? 1 : 0);
            if (expectedOpen)
                expect(onProjectOpen).toHaveBeenCalledWith(imported);
        },
    );
});
