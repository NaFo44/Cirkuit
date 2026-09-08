import { describe, expect, it } from "vitest";

import { Grid } from "./grid";

describe("Grid", () => {
    it("returns an empty cell for an unknown position", () => {
        const grid = Grid.empty();

        expect(grid.get(42, 17)).toEqual({
            type: "empty",
        });
    });

    it("can store a cell", () => {
        const grid = Grid.empty().withCell(10, 20, {
            type: "wire",
        });

        expect(grid.get(10, 20)).toEqual({
            type: "wire",
        });
    });

    it("can delete a cell", () => {
        const grid = Grid.empty()
            .withCell(10, 20, {
                type: "wire",
            })
            .withoutCell(10, 20);

        expect(grid.get(10, 20)).toEqual({
            type: "empty",
        });
    });

    it("keeps cells at different positions independent", () => {
        const grid = Grid.empty()
            .withCell(0, 0, {
                type: "wire",
            })
            .withCell(1, 0, {
                type: "light",
            });

        expect(grid.get(0, 0).type).toBe("wire");
        expect(grid.get(1, 0).type).toBe("light");
    });

    it("does not mutate the original grid", () => {
        const grid = Grid.empty();
        const updatedGrid = grid.withCell(0, 0, {
            type: "wire",
        });

        expect(grid.get(0, 0).type).toBe("empty");
        expect(updatedGrid.get(0, 0).type).toBe("wire");
    });
});
