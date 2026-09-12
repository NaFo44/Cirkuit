import { describe, expect, it } from "vitest";

import { rotateClockwise } from "./placedComponent";

describe("rotateClockwise", () => {
    it.each([
        [0, 90],
        [90, 180],
        [180, 270],
        [270, 0],
    ] as const)("rotates %i degrees to %i degrees", (rotation, expected) => {
        expect(rotateClockwise(rotation)).toBe(expected);
    });
});
