import { describe, expect, it } from "vitest";
import {
    gridToWorld,
    worldToGrid,
} from "./gridCoordinates";

describe("GridCoordinates", () => {
    it("converts world coordinates to grid coordinates", () => {
        expect(worldToGrid(0, 0)).toEqual({
            x: 0,
            y: 0,
        });

        expect(worldToGrid(19, 19)).toEqual({
            x: 0,
            y: 0,
        });

        expect(worldToGrid(20, 20)).toEqual({
            x: 1,
            y: 1,
        });

        expect(worldToGrid(41, 62)).toEqual({
            x: 2,
            y: 3,
        });
    });

    it("converts grid coordinates to world coordinates", () => {
        expect(gridToWorld(0, 0)).toEqual({
            x: 0,
            y: 0,
        });

        expect(gridToWorld(2, 3)).toEqual({
            x: 40,
            y: 60,
        });
    });
});