import type { Position } from "../grid/position";
import type { Direction } from "./port";
import type { Rotation } from "./placedComponent";

export const DIRECTIONS: readonly Direction[] = [
    "north",
    "east",
    "south",
    "west",
];

export const DIRECTION_OFFSETS: Record<Direction, Position> = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
};

export function oppositeDirection(direction: Direction): Direction {
    const index = DIRECTIONS.indexOf(direction);

    return DIRECTIONS[(index + 2) % DIRECTIONS.length];
}

export function rotateDirection(
    direction: Direction,
    rotation: Rotation,
): Direction {
    const index = DIRECTIONS.indexOf(direction);
    const turns = rotation / 90;

    return DIRECTIONS[(index + turns) % DIRECTIONS.length];
}
