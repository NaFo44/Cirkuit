import { describe, expect, it } from "vitest";

import type { BuiltInComponentType } from "../../domain/circuit/components/builtInComponents";
import {
    getComponentHoverLabel,
    getComponentPresentation,
} from "./componentPresentation";
import type { ComponentVisualState } from "./componentVisualState";

describe("componentPresentation", () => {
    it.each<[BuiltInComponentType, ComponentVisualState, string]>([
        ["wire", "floating", "Wire | Floating"],
        ["wire", "low", "Wire | Low"],
        ["wire", "high", "Wire | High"],
        ["wire", "conflict", "Wire | Conflict"],

        ["source", "default", "Source | High"],

        ["light", "default", "Light | Off"],
        ["light", "active", "Light | On"],
        ["light", "conflict", "Light | Conflict"],

        ["switch", "default", "Switch | Open"],
        ["switch", "active", "Switch | Closed"],

        ["not", "default", "NOT gate"],
    ])(
        "describes %s in the %s state",
        (componentType, visualState, expectedLabel) => {
            expect(getComponentHoverLabel(componentType, visualState)).toBe(
                expectedLabel,
            );
        },
    );

    it("provides a safe fallback for an unknown component", () => {
        expect(getComponentHoverLabel("custom-component", "high")).toBe(
            "custom-component",
        );
    });

    it("uses the expected glyph display strategy", () => {
        expect(getComponentPresentation("wire").glyphVisibility).toBe("hidden");

        expect(getComponentPresentation("switch").glyphVisibility).toBe(
            "on-hover",
        );

        expect(getComponentPresentation("not").glyphVisibility).toBe("always");
    });

    it("identifies rotatable components", () => {
        expect(getComponentPresentation("wire").rotatable).toBe(false);
        expect(getComponentPresentation("switch").rotatable).toBe(false);
        expect(getComponentPresentation("not").rotatable).toBe(true);
    });

    it("does not make unknown components rotatable", () => {
        expect(getComponentPresentation("custom-component").rotatable).toBe(
            false,
        );
    });
});
