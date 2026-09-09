import type { Cell } from "./cell";
import type { Position } from "./position";

export class Grid {
    private readonly cells: ReadonlyMap<string, Cell>;

    private constructor(cells: ReadonlyMap<string, Cell>) {
        this.cells = cells;
    }

    static empty(): Grid {
        return new Grid(new Map());
    }

    private key(x: number, y: number): string {
        return `${x},${y}`;
    }

    get(x: number, y: number): Cell {
        return (
            this.cells.get(this.key(x, y)) ?? {
                type: "empty",
            }
        );
    }

    withCell(x: number, y: number, cell: Cell): Grid {
        const key = this.key(x, y);

        if (this.cells.get(key)?.type === cell.type) {
            return this;
        }

        const cells = new Map(this.cells);
        cells.set(key, cell);

        return new Grid(cells);
    }

    withoutCell(x: number, y: number): Grid {
        const key = this.key(x, y);

        if (!this.cells.has(key)) {
            return this;
        }

        const cells = new Map(this.cells);
        cells.delete(key);

        return new Grid(cells);
    }

    *entries(): Generator<[Position, Cell]> {
        for (const [key, cell] of this.cells) {
            const [x, y] = key.split(",").map(Number);

            yield [{ x, y }, cell];
        }
    }
}
