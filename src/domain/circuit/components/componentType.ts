export const BUILT_IN_COMPONENT_TYPES = ["wire", "source", "light"] as const;

export type BuiltInComponentType = (typeof BUILT_IN_COMPONENT_TYPES)[number];
