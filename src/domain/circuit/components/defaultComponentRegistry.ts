import { ComponentRegistry } from "../componentRegistry";
import { lightDefinition } from "./light";
import { sourceDefinition } from "./source";
import { switchDefinition } from "./switch";
import { wireDefinition } from "./wire";
import { notDefinition } from "./not";

export const defaultComponentRegistry = new ComponentRegistry([
    sourceDefinition,
    wireDefinition,
    lightDefinition,
    switchDefinition,
    notDefinition,
]);
