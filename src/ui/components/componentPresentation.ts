import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/builtInComponents";
import type { ComponentVisualState } from "./componentVisualState";
import {
    getModuleId,
    type ModuleDefinition,
} from "../../domain/circuit/modules/moduleDefinition";

export type CircuitGlyphVisibility = "hidden" | "on-hover" | "always";

export interface ComponentPresentation {
    readonly label: string;
    readonly paletteColor: string;
    readonly glyphVisibility: CircuitGlyphVisibility;
    readonly rotatable: boolean;
    readonly getStateLabel: (
        visualState: ComponentVisualState,
    ) => string | null;
}

const WIRE_STATE_LABELS = {
    default: null,
    active: null,
    floating: "Floating",
    low: "Low",
    high: "High",
    conflict: "Conflict",
} satisfies Record<ComponentVisualState, string | null>;

const COMPONENT_PRESENTATIONS = {
    wire: {
        label: "Wire",
        paletteColor: "var(--cell-wire)",
        glyphVisibility: "hidden",
        getStateLabel: (visualState) => WIRE_STATE_LABELS[visualState],
        rotatable: false,
    },
    via: {
        label: "Via",
        paletteColor: "var(--cell-via)",
        glyphVisibility: "always",
        getStateLabel: (visualState) => WIRE_STATE_LABELS[visualState],
        rotatable: false,
    },
    source: {
        label: "Source",
        paletteColor: "var(--cell-source)",
        glyphVisibility: "hidden",
        getStateLabel: () => "High",
        rotatable: false,
    },
    clock: {
        label: "Clock",
        paletteColor: "var(--cell-clock)",
        glyphVisibility: "always",
        getStateLabel: (visualState) => WIRE_STATE_LABELS[visualState],
        rotatable: true,
    },
    memory: {
        label: "1-bit Memory",
        paletteColor: "var(--cell-memory)",
        glyphVisibility: "always",
        getStateLabel: (visualState) => {
            if (visualState === "conflict") {
                return "Conflict";
            }

            if (visualState === "high") {
                return "Stored 1";
            }

            return "Stored 0";
        },
        rotatable: true,
    },
    light: {
        label: "Light",
        paletteColor: "var(--cell-light)",
        glyphVisibility: "hidden",
        getStateLabel: (visualState) => {
            if (visualState === "conflict") {
                return "Conflict";
            }

            return visualState === "active" ? "On" : "Off";
        },
        rotatable: false,
    },
    switch: {
        label: "Switch",
        paletteColor: "var(--cell-switch)",
        glyphVisibility: "on-hover",
        getStateLabel: (visualState) =>
            visualState === "active" ? "Closed" : "Open",
        rotatable: false,
    },
    not: {
        label: "NOT gate",
        paletteColor: "var(--cell-not)",
        glyphVisibility: "always",
        getStateLabel: () => null,
        rotatable: true,
    },
    and: {
        label: "AND gate",
        paletteColor: "var(--cell-and)",
        glyphVisibility: "always",
        getStateLabel: () => null,
        rotatable: true,
    },
} satisfies Record<BuiltInComponentType, ComponentPresentation>;

export function getComponentPresentation(
    componentType: string,
    modules: readonly ModuleDefinition[] = [],
): ComponentPresentation {
    const moduleId = getModuleId(componentType);
    const module =
        moduleId === undefined
            ? undefined
            : modules.find((definition) => definition.id === moduleId);

    if (module) {
        return {
            label: module.name,
            paletteColor: "var(--cell-module, #e8edf5)",
            glyphVisibility: "hidden",
            rotatable: true,
            getStateLabel: () => null,
        };
    }

    if (!isBuiltInComponentType(componentType)) {
        return {
            label: componentType,
            paletteColor: "transparent",
            glyphVisibility: "hidden",
            rotatable: false,
            getStateLabel: () => null,
        };
    }

    return COMPONENT_PRESENTATIONS[componentType];
}

export function getComponentHoverLabel(
    componentType: string,
    visualState: ComponentVisualState,
    modules: readonly ModuleDefinition[] = [],
): string {
    const presentation = getComponentPresentation(componentType, modules);
    const stateLabel = presentation.getStateLabel(visualState);

    return stateLabel
        ? `${presentation.label} | ${stateLabel}`
        : presentation.label;
}
