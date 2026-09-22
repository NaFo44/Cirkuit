import { defaultComponentRegistry } from "../domain/circuit/components/builtInComponents";
import type { CircuitProject } from "../domain/project/circuitProject";
import { parseProjectDocument } from "../domain/project/serialization/projectDocument";
import defaultProjectDocument from "./default-project.cirkuit?raw";

export function createDefaultProject(): CircuitProject {
    return parseProjectDocument(defaultProjectDocument, defaultComponentRegistry);
}
