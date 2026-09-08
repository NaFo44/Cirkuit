export const COMPONENT_TYPES = [
    "wire",
    "source",
    "light",
] as const;

export type ComponentType = typeof COMPONENT_TYPES[number];

export type CellType = "empty" | ComponentType;

export interface Cell {
    readonly type: CellType;
}
