export const BUILT_IN_COMPONENT_TYPES = ["wire", "source", "light"] as const;

export type BuiltInComponentType = (typeof BUILT_IN_COMPONENT_TYPES)[number];

export function isBuiltInComponentType(
    type: string,
): type is BuiltInComponentType {
    return BUILT_IN_COMPONENT_TYPES.some((builtInType) => builtInType === type);
}
