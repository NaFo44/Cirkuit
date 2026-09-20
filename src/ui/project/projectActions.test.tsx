import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectActions } from "./projectActions";

function renderProjectActions(error: string | null): string {
    return renderToStaticMarkup(
        <ProjectActions
            error={error}
            onOpen={() => Promise.resolve()}
            onSave={() => undefined}
        />,
    );
}

describe("ProjectActions", () => {
    it("renders open and save actions", () => {
        const markup = renderProjectActions(null);

        expect(markup).toContain('aria-label="Open project"');
        expect(markup).toContain('aria-label="Download project"');

        expect(markup).toContain(">Open</span>");
        expect(markup).toContain(">Save</span>");
    });

    it("accepts Cirkuit and JSON project files", () => {
        const markup = renderProjectActions(null);

        expect(markup).toContain('accept=".cirkuit,.json,application/json"');
    });

    it("does not render an alert without an error", () => {
        const markup = renderProjectActions(null);

        expect(markup).not.toContain('role="alert"');
    });

    it("renders project file errors accessibly", () => {
        const markup = renderProjectActions(
            "Project document is not valid JSON",
        );

        expect(markup).toContain('role="alert"');
        expect(markup).toContain("Project document is not valid JSON");
    });
});
