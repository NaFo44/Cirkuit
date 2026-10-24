// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestModule, createTestProject } from "../../test/moduleFixtures";
import { useProjectEditor } from "./useProjectEditor";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Editor = ReturnType<typeof useProjectEditor>;

function EditorProbe({ onChange }: { onChange: (editor: Editor) => void }) {
    const editor = useProjectEditor(createTestProject);
    useLayoutEffect(() => onChange(editor), [editor, onChange]);
    return null;
}

describe("module library history", () => {
    let root: Root;
    let container: HTMLDivElement;
    let editor: Editor;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
        root = createRoot(container);
        act(() =>
            root.render(
                <EditorProbe
                    onChange={(next) => {
                        editor = next;
                    }}
                />,
            ),
        );
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it("undoes and redoes the library and its matching catalog together", () => {
        const original = editor.project;
        act(() => editor.updateModules([createTestModule()]));
        const withModules = editor.project;
        expect(editor.canUndo).toBe(true);
        expect(withModules.modules).toHaveLength(1);
        expect(withModules.circuit.registry.has("module:inverter")).toBe(true);

        act(() => editor.undo());
        expect(editor.project).toBe(original);
        expect(editor.project.modules).toEqual([]);
        expect(editor.project.circuit.registry.has("module:inverter")).toBe(
            false,
        );

        act(() => editor.redo());
        expect(editor.project).toBe(withModules);
        expect(editor.project.circuit.registry.has("module:inverter")).toBe(
            true,
        );
    });

    it("preserves definitions when painting and undoing subsequent edits", () => {
        act(() => editor.updateModules([createTestModule()]));
        act(() =>
            editor.paintCell(
                { kind: "component", componentType: "wire", rotation: 0 },
                { x: 8, y: 8 },
                0,
            ),
        );
        expect(editor.project.modules).toHaveLength(1);
        expect(
            editor.project.circuit.getComponentAt({ x: 8, y: 8 })?.type,
        ).toBe("wire");

        act(() => editor.undo());
        expect(editor.project.modules).toHaveLength(1);
        expect(
            editor.project.circuit.getComponentAt({ x: 8, y: 8 }),
        ).toBeUndefined();

        act(() => editor.undo());
        expect(editor.project.modules).toEqual([]);
    });
});
