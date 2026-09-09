import { describe, expect, it } from "vitest";

import { ComponentRegistry } from "./componentRegistry";
import { sourceDefinition } from "./components/source";

describe("ComponentRegistry", () => {
    it("returns a registered component definition", () => {
        const registry = new ComponentRegistry([
            sourceDefinition,
        ]);

        expect(registry.get("source")).toBe(
            sourceDefinition
        );
    });

    it("rejects duplicate component types", () => {
        expect(
            () =>
                new ComponentRegistry([
                    sourceDefinition,
                    sourceDefinition,
                ]),
        ).toThrow("Duplicated component type")
    });

    it("rejects unknown component types", () => {
        const registry = new ComponentRegistry([]);

        expect(() => registry.get("unknown")).toThrow(
            "Unknown component type",
        );
    });
});