import { ComponentRegistry } from "../componentRegistry";
import type { ComponentDefinition } from "../componentDefinition";
import { andDefinition } from "./and";
import { lightDefinition } from "./light";
import { notDefinition } from "./not";
import { sourceDefinition } from "./source";
import { switchDefinition } from "./switch";
import { wireDefinition } from "./wire";

export const BUILT_IN_COMPONENT_DEFINITIONS = [
    wireDefinition,
    sourceDefinition,
    lightDefinition,
    switchDefinition,
    notDefinition,
    andDefinition,
] as const satisfies readonly ComponentDefinition[];

export type BuiltInComponentType =
    (typeof BUILT_IN_COMPONENT_DEFINITIONS)[number]["type"];

export const BUILT_IN_COMPONENT_TYPES = BUILT_IN_COMPONENT_DEFINITIONS.map(
    (definition) => definition.type,
) as readonly BuiltInComponentType[];

export function isBuiltInComponentType(
    type: string,
): type is BuiltInComponentType {
    return BUILT_IN_COMPONENT_TYPES.some((builtInType) => builtInType === type);
}

export const defaultComponentRegistry = new ComponentRegistry(
    BUILT_IN_COMPONENT_DEFINITIONS,
);
