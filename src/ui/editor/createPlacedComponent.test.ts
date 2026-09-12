import { afterEach, describe, expect, it, vi } from "vitest";

import { createPlacedComponent } from "./createPlacedComponent";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("createPlacedComponent", () => {
    it("creates a component with a generated id and default rotation", () => {
        const generatedId = "00000000-0000-4000-8000-000000000001";

        const randomUUID = vi
            .spyOn(crypto, "randomUUID")
            .mockReturnValue(generatedId);

        const position = {
            x: 4,
            y: 7,
        };

        const placedComponent = createPlacedComponent("source", position);

        expect(randomUUID).toHaveBeenCalledOnce();

        expect(placedComponent).toEqual({
            id: generatedId,
            type: "source",
            position: {
                x: 4,
                y: 7,
            },
            rotation: 0,
        });
    });

    it("copies the received position", () => {
        const position = {
            x: 2,
            y: 3,
        };

        const placedComponent = createPlacedComponent("wire", position);

        expect(placedComponent.position).toEqual(position);

        expect(placedComponent.position).not.toBe(position);
    });

    it("uses the requested rotation", () => {
        const placedComponent = createPlacedComponent(
            "light",
            { x: 1, y: 2 },
            270,
        );

        expect(placedComponent.rotation).toBe(270);
    });
});
