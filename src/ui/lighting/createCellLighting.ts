import type { CircuitLayout } from "../../domain/circuit/circuitLayout";
import type { Position } from "../../domain/grid/position";
import type { ComponentVisualState } from "../components/componentVisualState";

const LIGHT_LEVELS_BY_DISTANCE = [3, 2, 1] as const;

export type LightLevel = (typeof LIGHT_LEVELS_BY_DISTANCE)[number];

export interface LitCell {
    position: Position;
    level: LightLevel;
}

function positionKey(x: number, y: number): string {
    return `${x},${y}`;
}

export function createCellLighting(
    circuit: CircuitLayout,
    componentVisualStates: ReadonlyMap<string, ComponentVisualState>,
): readonly LitCell[] {
    const lightLevels = new Map<string, LitCell>();

    for (const component of circuit.components) {
        if (
            component.type !== "light" ||
            componentVisualStates.get(component.id) !== "active"
        ) {
            continue;
        }

        const maximumDistance = LIGHT_LEVELS_BY_DISTANCE.length;

        for (
            let offsetY = -maximumDistance;
            offsetY <= maximumDistance;
            offsetY += 1
        ) {
            for (
                let offsetX = -maximumDistance;
                offsetX <= maximumDistance;
                offsetX += 1
            ) {
                const distance = Math.abs(offsetX) + Math.abs(offsetY);

                if (distance === 0 || distance > maximumDistance) {
                    continue;
                }

                const x = component.position.x + offsetX;
                const y = component.position.y + offsetY;

                if (
                    x < 0 ||
                    y < 0 ||
                    x >= circuit.width ||
                    y >= circuit.height
                ) {
                    continue;
                }

                const level = LIGHT_LEVELS_BY_DISTANCE[distance - 1];
                const key = positionKey(x, y);
                const currentCell = lightLevels.get(key);

                if (!currentCell || currentCell.level < level) {
                    lightLevels.set(key, {
                        position: { x, y },
                        level,
                    });
                }
            }
        }
    }

    return [...lightLevels.values()].sort(
        (first, second) =>
            first.position.y - second.position.y ||
            first.position.x - second.position.x,
    );
}
