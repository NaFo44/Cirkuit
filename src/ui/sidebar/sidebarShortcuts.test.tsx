import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SidebarShortcuts } from "./sidebarShortcuts";

describe("SidebarShortcuts", () => {
    it("shows editing shortcuts in edit mode", () => {
        const markup = renderToStaticMarkup(
            <SidebarShortcuts mode="edit" onClose={() => undefined} />,
        );

        expect(markup).toContain("Left drag");
        expect(markup).toContain("Rotate");
        expect(markup).not.toContain("Toggle switch");
    });

    it("shows interaction shortcuts in simulation mode", () => {
        const markup = renderToStaticMarkup(
            <SidebarShortcuts mode="simulate" onClose={() => undefined} />,
        );

        expect(markup).toContain("Toggle switch");
        expect(markup).not.toContain("Left drag");
    });

    it("always shows common shortcuts", () => {
        const markup = renderToStaticMarkup(
            <SidebarShortcuts mode="edit" onClose={() => undefined} />,
        );

        expect(markup).toContain("Pinch / wheel");
        expect(markup).toContain("Right / middle drag");
    });
});
