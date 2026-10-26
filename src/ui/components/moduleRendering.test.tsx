// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createTestModule } from "../../test/moduleFixtures";
import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import { ModuleCatalog } from "../../domain/circuit/modules/moduleCatalog";
import { createModuleInstance } from "../../domain/circuit/modules/moduleDefinition";
import { portKey } from "../../domain/circuit/netlist/netlist";
import type { Signal } from "../../domain/circuit/signal";
import { CircuitGrid } from "../grid/circuitGrid";
import { CellPreview } from "../grid/cellPreview";
import { SelectionLayer } from "../selection/selectionLayer";
import { createSelectionOutline } from "../selection/selectionOutline";
import {
    getComponentRenderBounds,
    getPortRenderPosition,
} from "./componentRenderGeometry";
import {
    getComponentPresentation,
    getComponentHoverLabel,
} from "./componentPresentation";
import { ModuleSymbol } from "./moduleSymbol";

const definition = createTestModule({
    name: "Inverter",
    footprint: { width: 4, height: 3 },
});
const catalog = new ModuleCatalog([definition]);

function instance(rotation: 0 | 90 | 180 | 270 = 0) {
    return createModuleInstance("inverter", {
        id: "module-1",
        position: { x: 2, y: 3 },
        rotation,
        layer: 0,
    });
}

function render(element: Parameters<typeof renderToStaticMarkup>[0]) {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(element);
    return container;
}

describe("module rendering geometry", () => {
    it.each([
        [0, 80, 60, 42, 90, "west"],
        [90, 60, 80, 70, 62, "north"],
        [180, 80, 60, 118, 90, "east"],
        [270, 60, 80, 70, 138, "south"],
    ] as const)(
        "resolves bounds and port pixels at rotation %i",
        (rotation, width, height, x, y, side) => {
            const placed = instance(rotation);
            const descriptor = catalog.get(placed.type);
            expect(getComponentRenderBounds(placed, descriptor)).toEqual({
                left: 40,
                top: 60,
                width,
                height,
            });
            expect(
                getPortRenderPosition(placed, descriptor, descriptor.ports[0]),
            ).toEqual({ x, y, side, layer: 0 });
        },
    );

    it("resolves the module name and rotation capability for presentation", () => {
        const presentation = getComponentPresentation("module:inverter", [
            definition,
        ]);
        expect(presentation.label).toBe("Inverter");
        expect(presentation.rotatable).toBe(true);
        expect(
            getComponentHoverLabel("module:inverter", "default", [definition]),
        ).toBe("Inverter");
    });
});

describe("ModuleSymbol", () => {
    it.each(["floating", "low", "high", "conflict"] as const)(
        "renders a separate %s state for a named port",
        (signal) => {
            const signals = new Map<string, Signal>([
                [portKey({ componentId: "module-1", portId: "a" }), signal],
            ]);
            const container = render(
                <ModuleSymbol
                    component={instance()}
                    definition={definition}
                    signals={signals}
                />,
            );
            const pins = container.querySelectorAll(".module-symbol__pin");
            expect(pins[0].getAttribute("data-signal")).toBe(signal);
            expect(pins[0].getAttribute("aria-label")).toContain("A | Input");
            expect(pins[0].getAttribute("aria-label")).toContain(
                signal.charAt(0).toUpperCase() + signal.slice(1),
            );
            expect(pins[1].getAttribute("data-signal")).toBe("default");
            expect(
                container.querySelector(".module-symbol__name")?.textContent,
            ).toBe("Inverter");
        },
    );

    it.each([
        [0, 0, 20, "west"],
        [90, 20, 0, "north"],
        [180, 60, 20, "east"],
        [270, 20, 60, "south"],
    ] as const)(
        "aligns the full port cell at rotation %i without an orientation marker",
        (rotation, left, top, side) => {
            const container = render(
                <ModuleSymbol
                    component={instance(rotation)}
                    definition={definition}
                />,
            );
            const pin = container.querySelector<HTMLElement>(
                ".module-symbol__pin",
            );
            expect(pin?.dataset.side).toBe(side);
            expect(pin?.style.left).toBe(`${left}px`);
            expect(pin?.style.top).toBe(`${top}px`);
            expect(pin?.style.width).toBe("20px");
            expect(pin?.style.height).toBe("20px");
            expect(
                container.querySelector(".module-symbol__orientation"),
            ).toBeNull();
            expect(
                container.querySelector(".module-symbol__name")?.textContent,
            ).toBe("Inverter");
        },
    );

    it("removes inactive layer ports from keyboard navigation", () => {
        const container = render(
            <ModuleSymbol
                component={instance()}
                definition={definition}
                inactive
            />,
        );
        expect(
            container
                .querySelector(".module-symbol")
                ?.getAttribute("data-inactive"),
        ).toBe("true");
        for (const pin of container.querySelectorAll(".module-symbol__pin")) {
            expect(pin.getAttribute("tabindex")).toBe("-1");
        }
    });
});

describe("module footprints in editor layers", () => {
    it("renders the full rotated grid cell with its module symbol", () => {
        const circuit = CircuitLayout.from(
            {
                width: 12,
                height: 12,
                components: [instance(90)],
            },
            catalog,
        );
        const container = render(
            <CircuitGrid
                circuit={circuit}
                registry={catalog}
                modules={[definition]}
                componentVisualStates={new Map()}
            />,
        );
        const cell = container.querySelector<HTMLElement>('[role="gridcell"]');
        expect(cell?.style.width).toBe("60px");
        expect(cell?.style.height).toBe("80px");
        expect(cell?.getAttribute("aria-colspan")).toBe("3");
        expect(cell?.getAttribute("aria-rowspan")).toBe("4");
        expect(cell?.getAttribute("aria-label")).toContain("Inverter");
        expect(cell?.querySelectorAll(".module-symbol__pin")).toHaveLength(2);
    });

    it("sizes the selection move handle to the complete module footprint", () => {
        const container = render(
            <SelectionLayer
                width={240}
                height={240}
                interactionMode="move"
                selectedComponents={[instance(90)]}
                registry={catalog}
                onSelect={() => undefined}
                canMove={() => true}
                onMove={() => undefined}
                onDelete={() => undefined}
            />,
        );
        const handle = container.querySelector<HTMLElement>(
            "[data-selection-move-handle]",
        );
        expect(handle?.style.left).toBe("40px");
        expect(handle?.style.top).toBe("60px");
        expect(handle?.style.width).toBe("60px");
        expect(handle?.style.height).toBe("80px");
    });

    it("draws the perimeter of all occupied cells", () => {
        const outline = createSelectionOutline(
            [instance(90)],
            { x: 1, y: -1 },
            catalog,
        );
        expect(outline).toHaveLength(14);
        const xs = outline.flatMap((segment) => [segment.x1, segment.x2]);
        const ys = outline.flatMap((segment) => [segment.y1, segment.y2]);
        expect([Math.min(...xs), Math.max(...xs)]).toEqual([60, 120]);
        expect([Math.min(...ys), Math.max(...ys)]).toEqual([40, 120]);
    });

    it("does not duplicate outlines for overlapping layers or vias", () => {
        const top = {
            id: "top",
            type: "wire",
            position: { x: 0, y: 0 },
            rotation: 0 as const,
            layer: 0 as const,
        };
        expect(
            createSelectionOutline([top, { ...top, id: "bottom", layer: 1 }]),
        ).toHaveLength(4);
        expect(createSelectionOutline([{ ...top, type: "via" }])).toHaveLength(
            4,
        );
    });

    it("sizes the cursor preview using cell dimensions", () => {
        const container = render(
            <CellPreview
                position={{ x: 2, y: 3 }}
                cellSize={10}
                footprint={{ width: 3, height: 4 }}
            />,
        );
        const preview = container.querySelector<HTMLElement>(".cell-preview");
        expect(preview?.style.left).toBe("20px");
        expect(preview?.style.top).toBe("30px");
        expect(preview?.style.width).toBe("30px");
        expect(preview?.style.height).toBe("40px");
    });
});
