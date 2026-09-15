import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";
import type { ComponentVisualState } from "./componentVisualState";

export type CircuitGlyphVisibility = "hidden" | "on-hover" | "always";

export interface ComponentPresentation {
    readonly label: string;
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
        glyphVisibility: "hidden",
        getStateLabel: (visualState) => WIRE_STATE_LABELS[visualState],
        rotatable: false,
    },
    source: {
        label: "Source",
        glyphVisibility: "hidden",
        getStateLabel: () => "High",
        rotatable: false,
    },
    light: {
        label: "Light",
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
        glyphVisibility: "on-hover",
        getStateLabel: (visualState) =>
            visualState === "active" ? "Closed" : "Open",
        rotatable: false,
    },
    not: {
        label: "NOT gate",
        glyphVisibility: "always",
        getStateLabel: () => null,
        rotatable: true,
    },
} satisfies Record<BuiltInComponentType, ComponentPresentation>;

export function getComponentPresentation(
    componentType: string,
): ComponentPresentation {
    if (!isBuiltInComponentType(componentType)) {
        return {
            label: componentType,
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
): string {
    const presentation = getComponentPresentation(componentType);
    const stateLabel = presentation.getStateLabel(visualState);

    return stateLabel
        ? `${presentation.label} | ${stateLabel}`
        : presentation.label;
}
