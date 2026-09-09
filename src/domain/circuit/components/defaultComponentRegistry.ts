import { ComponentRegistry } from "../componentRegistry";
import { lightDefinition } from "./light";
import { sourceDefinition } from "./source";
import { wireDefinition } from "./wire";

export const defaultComponentRegistry = new ComponentRegistry([
    sourceDefinition,
    wireDefinition,
    lightDefinition,
]);
