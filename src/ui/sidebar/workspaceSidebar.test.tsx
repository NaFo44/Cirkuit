import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WorkspaceSidebar } from "./workspaceSidebar";

describe("WorkspaceSidebar", () => {
    it("renders each content area in its expected slot", () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSidebar
                topContent={<div data-slot="top">Top</div>}
                bottomContent={<div data-slot="bottom">Bottom</div>}
                footer={<div data-slot="footer">Footer</div>}
            >
                <div data-slot="center">Center</div>
            </WorkspaceSidebar>,
        );

        expect(markup).toContain('data-slot="top"');
        expect(markup).toContain('data-slot="center"');
        expect(markup).toContain('data-slot="bottom"');
        expect(markup).toContain('data-slot="footer"');
    });

    it("connects the toggle to the collapsible panel", () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSidebar>Content</WorkspaceSidebar>,
        );

        const panelId = markup.match(/id="([^"]+)"/)?.[1];

        expect(panelId).toBeDefined();
        expect(markup).toContain(`aria-controls="${panelId}"`);
        expect(markup).toContain('aria-expanded="true"');
    });
});
