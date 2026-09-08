export type CellType =
    | "empty"
    | "wire"
    | "source"
    | "light";

export interface Cell {
    readonly type: CellType;
}
