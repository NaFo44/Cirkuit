import { describe, expect, it } from "vitest";

import {
    MAX_ZOOM,
    MIN_ZOOM,
    clamp,
    snapToDevicePixel,
    snapZoomToCellPixels,
} from "./mapViewportMath";

describe("mapViewportMath", () => {
    it("clamps values to the requested interval", () => {
        expect(clamp(-1, 0, 10)).toBe(0);
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(12, 0, 10)).toBe(10);
    });

    it("snaps translations to physical pixels", () => {
        expect(snapToDevicePixel(10.26, 2)).toBe(10.5);
        expect(snapToDevicePixel(-10.26, 2)).toBe(-10.5);
    });

    it("makes the rendered cell size an integer number of physical pixels", () => {
        const cellSize = 20;
        const pixelRatio = 1.25;

        const zoom = snapZoomToCellPixels(1.03, cellSize, pixelRatio);

        const physicalCellSize = cellSize * zoom * pixelRatio;

        expect(Number.isInteger(physicalCellSize)).toBe(true);
    });

    it("does not go below the minimum zoom", () => {
        const zoom = snapZoomToCellPixels(0, 20, 1);

        expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    });

    it("does not go above the maximum zoom", () => {
        const zoom = snapZoomToCellPixels(10, 20, 1);

        expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
    });

    it("keeps an exact zoom when the cell already aligns with the physical pixels", () => {
        expect(snapZoomToCellPixels(1, 20, 1)).toBe(1);
        expect(snapZoomToCellPixels(2, 20, 1.25)).toBe(2);
    });
});
