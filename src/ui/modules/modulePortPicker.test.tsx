// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import { ModulePortPicker } from "./modulePortPicker";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("module wire selection", () => {
    let root: Root;
    let container: HTMLDivElement;
    const circuit = CircuitLayout.empty(6, 6)
        .withComponent({
            id: "wire-front",
            type: "wire",
            position: { x: 1, y: 1 },
            rotation: 0,
            layer: 0,
        })
        .withComponent({
            id: "wire-back",
            type: "wire",
            position: { x: 1, y: 1 },
            rotation: 90,
            layer: 1,
        })
        .withComponent({
            id: "not",
            type: "not",
            position: { x: 2, y: 1 },
            rotation: 0,
            layer: 0,
        })
        .withComponent({
            id: "via",
            type: "via",
            position: { x: 3, y: 1 },
            rotation: 0,
            layer: 0,
        });

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it.each([0, 1] as const)(
        "selects the whole wire cell on layer %s without offering gates or vias",
        (layer) => {
            const onPick = vi.fn();
            act(() =>
                root.render(
                    <ModulePortPicker
                        circuit={circuit}
                        layer={layer}
                        onPick={onPick}
                        interactive
                    />,
                ),
            );
            const buttons = container.querySelectorAll("button");
            expect(buttons).toHaveLength(1);
            expect(buttons[0].getAttribute("aria-label")).toBe(
                "Select wire at 1,1",
            );
            expect(buttons[0].style.width).toBe("20px");
            expect(buttons[0].style.height).toBe("20px");
            act(() => buttons[0].click());
            expect(onPick).toHaveBeenCalledExactlyOnceWith(
                layer === 0 ? "wire-front" : "wire-back",
            );
        },
    );

    it("highlights a legacy wire reference as a whole cell without intercepting input", () => {
        act(() =>
            root.render(
                <ModulePortPicker
                    circuit={circuit}
                    layer={0}
                    onPick={vi.fn()}
                    interactive={false}
                    selectedReference={{
                        componentId: "wire-front",
                        portId: "east",
                    }}
                />,
            ),
        );
        expect(container.querySelectorAll("button")).toHaveLength(0);
        expect(
            container.querySelector<HTMLElement>(
                ".module-port-picker__selection",
            )!.style.width,
        ).toBe("20px");
    });
});
