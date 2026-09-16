export interface Position {
    readonly x: number;
    readonly y: number;
}

export function positionKey(position: Position): string {
    return `${position.x},${position.y}`;
}
