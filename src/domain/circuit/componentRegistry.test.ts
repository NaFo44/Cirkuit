import { describe, expect, it } from "vitest";

import { ComponentRegistry } from "./componentRegistry";
import { sourceDefinition } from "./components/source";
import type { ComponentDefinition } from "./componentDefinition";

interface DefinitionOptions {
    readonly type?: string;
    readonly ports?: ComponentDefinition["ports"];
    readonly conductiveGroups?: ComponentDefinition["conductiveGroups"];
}

function createDefinition(
    options: DefinitionOptions = {},
): ComponentDefinition {
    return {
        type: options.type ?? "test",
        ports: options.ports ?? [],
        conductiveGroups: options.conductiveGroups,
        createInitialState: () => null,
        computeOutputs: () => new Map(),
    };
}

describe("ComponentRegistry", () => {
    it("returns a registered component definition", () => {
        const registry = new ComponentRegistry([sourceDefinition]);

        expect(registry.get("source")).toBe(sourceDefinition);
    });

    it("rejects duplicate component types", () => {
        expect(
            () => new ComponentRegistry([sourceDefinition, sourceDefinition]),
        ).toThrow("Duplicated component type");
    });

    it("rejects unknown component types", () => {
        const registry = new ComponentRegistry([]);

        expect(() => registry.get("unknown")).toThrow("Unknown component type");
    });

    it("reports whether a component type is registered", () => {
        const registry = new ComponentRegistry([sourceDefinition]);

        expect(registry.has("source")).toBe(true);
        expect(registry.has("unknown")).toBe(false);
    });

    it("rejects an empty component type", () => {
        expect(
            () => new ComponentRegistry([createDefinition({ type: " " })]),
        ).toThrow("Component type cannot be empty");
    });

    it("rejects an empty port id", () => {
        expect(
            () =>
                new ComponentRegistry([
                    createDefinition({
                        ports: [
                            {
                                id: "",
                                kind: "input",
                                side: "west",
                            },
                        ],
                    }),
                ]),
        ).toThrow("Empty port id");
    });

    it("rejects duplicate port ids", () => {
        expect(
            () =>
                new ComponentRegistry([
                    createDefinition({
                        ports: [
                            {
                                id: "signal",
                                kind: "input",
                                side: "west",
                            },
                            {
                                id: "signal",
                                kind: "output",
                                side: "east",
                            },
                        ],
                    }),
                ]),
        ).toThrow("Duplicated port id");
    });

    it("rejects multiple ports on the same side", () => {
        expect(
            () =>
                new ComponentRegistry([
                    createDefinition({
                        ports: [
                            {
                                id: "first",
                                kind: "input",
                                side: "west",
                            },
                            {
                                id: "second",
                                kind: "output",
                                side: "west",
                            },
                        ],
                    }),
                ]),
        ).toThrow('Duplicated port side "west"');
    });

    it("rejects conductive groups with fewer than two ports", () => {
        expect(
            () =>
                new ComponentRegistry([
                    createDefinition({
                        ports: [
                            {
                                id: "west",
                                kind: "passive",
                                side: "west",
                            },
                        ],
                        conductiveGroups: [["west"]],
                    }),
                ]),
        ).toThrow("Conductive groups must contain at least two ports");
    });

    it("rejects unknown ports in conductive groups", () => {
        expect(
            () =>
                new ComponentRegistry([
                    createDefinition({
                        ports: [
                            {
                                id: "west",
                                kind: "passive",
                                side: "west",
                            },
                        ],
                        conductiveGroups: [["west", "missing"]],
                    }),
                ]),
        ).toThrow('Unknown conductive port "missing"');
    });

    it("rejects active ports in conductive groups", () => {
        expect(
            () =>
                new ComponentRegistry([
                    createDefinition({
                        ports: [
                            {
                                id: "input",
                                kind: "input",
                                side: "west",
                            },
                            {
                                id: "east",
                                kind: "passive",
                                side: "east",
                            },
                        ],
                        conductiveGroups: [["input", "east"]],
                    }),
                ]),
        ).toThrow('Conductive port "input" must be passive');
    });

    it("rejects ports belonging to multiple conductive groups", () => {
        expect(
            () =>
                new ComponentRegistry([
                    createDefinition({
                        ports: [
                            {
                                id: "north",
                                kind: "passive",
                                side: "north",
                            },
                            {
                                id: "east",
                                kind: "passive",
                                side: "east",
                            },
                            {
                                id: "south",
                                kind: "passive",
                                side: "south",
                            },
                        ],
                        conductiveGroups: [
                            ["north", "east"],
                            ["east", "south"],
                        ],
                    }),
                ]),
        ).toThrow('Conductive port "east" belongs to multiple groups');
    });
});
