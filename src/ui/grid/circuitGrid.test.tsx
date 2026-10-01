import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { BuiltInComponentType } from "../../domain/circuit/components/builtInComponents";
import type { PlacedComponent } from "../../domain/circuit/placedComponent";
import type { ComponentVisualState } from "../components/componentVisualState";
import { CircuitGrid } from "./circuitGrid";

function renderComponent(
    componentType: BuiltInComponentType,
    visualState: ComponentVisualState,
): string {
    const component: PlacedComponent = {
        id: "component-1",
        type: componentType,
        position: { x: 0, y: 0 },
        rotation: 0,
        layer: 0,
    };

    const circuit = CircuitLayout.empty(1, 1).withComponent(component);

    return renderToStaticMarkup(
        <CircuitGrid
            circuit={circuit}
            componentVisualStates={
                new Map<string, ComponentVisualState>([
                    [component.id, visualState],
                ])
            }
        />,
    );
}

describe("CircuitGrid", () => {
    it.each<ComponentVisualState>(["floating", "low", "high", "conflict"])(
        "renders the exact %s visual-state class",
        (visualState) => {
            const markup = renderComponent("wire", visualState);

            expect(markup).toMatch(
                new RegExp(
                    `class="[^"]*\\bcircuit-component--${visualState}(?=\\s|")`,
                ),
            );
        },
    );

    it("does not render a glyph for a wire", () => {
        const markup = renderComponent("wire", "floating");

        expect(markup).not.toContain('class="component-glyph"');
    });

    it("renders a hover glyph for a switch", () => {
        const markup = renderComponent("switch", "default");

        expect(markup).toContain("circuit-component--glyph-on-hover");
        expect(markup).toContain('class="component-glyph"');
    });

    it("renders a persistent glyph for a logic gate", () => {
        const markup = renderComponent("not", "default");

        expect(markup).toContain("circuit-component--glyph-always");
        expect(markup).toContain('class="component-glyph"');
    });

    it("renders the active layer above an inactive non-interactive layer", () => {
        const inactive: PlacedComponent = {
            id: "inactive",
            type: "switch",
            position: { x: 0, y: 0 },
            rotation: 0,
            layer: 1,
        };
        const active: PlacedComponent = {
            id: "active",
            type: "wire",
            position: { x: 0, y: 0 },
            rotation: 0,
            layer: 0,
        };
        const circuit = CircuitLayout.from({
            width: 1,
            height: 1,
            components: [active, inactive],
        });

        const markup = renderToStaticMarkup(
            <CircuitGrid
                circuit={circuit}
                activeLayer={0}
                componentVisualStates={new Map()}
                onComponentInteract={() => undefined}
            />,
        );

        expect(markup).toContain("circuit-component--inactive-layer");
        expect(markup).toContain("opacity:0.25;pointer-events:none");
        expect(markup.indexOf("layer 1")).toBeLessThan(
            markup.indexOf("layer 0"),
        );
    });
});
