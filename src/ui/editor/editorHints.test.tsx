import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EditorHints } from "./editorHints";

describe("EditorHints", () => {
    it("shows editing shortcuts in edit mode", () => {
        const markup = renderToStaticMarkup(<EditorHints mode="edit" />);

        expect(markup).toContain("Left drag");
        expect(markup).toContain("Rotate");
        expect(markup).not.toContain("Toggle switch");
    });

    it("shows interaction shortcuts in simulation mode", () => {
        const markup = renderToStaticMarkup(<EditorHints mode="simulate" />);

        expect(markup).toContain("Toggle switch");
        expect(markup).not.toContain("Left drag");
    });

    it("always shows common shortcuts", () => {
        const markup = renderToStaticMarkup(<EditorHints mode="edit" />);

        expect(markup).toContain("Space");
        expect(markup).toContain("Pinch / wheel");
        expect(markup).toContain("Right / middle drag");
    });
});
