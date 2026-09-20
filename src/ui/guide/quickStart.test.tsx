import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuickStart } from "./quickStart";

describe("QuickStart", () => {
    it("renders its optional footer", () => {
        const markup = renderToStaticMarkup(
            <QuickStart
                footer={<div data-project-actions="">Project actions</div>}
            />,
        );

        expect(markup).toContain('class="quick-start__footer"');

        expect(markup).toContain('data-project-actions=""');
        expect(markup).toContain("Project actions");
    });

    it("does not render an empty footer", () => {
        const markup = renderToStaticMarkup(<QuickStart />);

        expect(markup).not.toContain('class="quick-start__footer"');
    });
});
