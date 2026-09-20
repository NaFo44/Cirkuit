import { describe, expect, it } from "vitest";

import { isRotation, rotateClockwise } from "./placedComponent";

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

describe("isRotation", () => {
    it.each([0, 90, 180, 270] as const)(
        "accepts the valid rotation %s",
        (rotation) => {
            expect(isRotation(rotation)).toBe(true);
        },
    );

    it.each([
        -90,
        45,
        360,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        "90",
        null,
        undefined,
    ])("rejects the invalid rotation %s", (rotation) => {
        expect(isRotation(rotation)).toBe(false);
    });
});
