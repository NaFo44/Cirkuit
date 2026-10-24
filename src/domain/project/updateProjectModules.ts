import { CircuitLayout } from "../circuit/circuitLayout";
import { ModuleCatalog } from "../circuit/modules/moduleCatalog";
import type { ModuleDefinition } from "../circuit/modules/moduleDefinition";
import type { CircuitProject } from "./circuitProject";

export function updateProjectModules(
    project: CircuitProject,
    modules: readonly ModuleDefinition[],
): CircuitProject {
    if (modules === project.modules) {
        return project;
    }

    const primitives =
        project.circuit.registry instanceof ModuleCatalog
            ? project.circuit.registry.primitiveCatalog
            : project.circuit.registry;

    const catalog = new ModuleCatalog(modules, primitives);

    return {
        ...project,
        modules: catalog.modules,
        circuit: CircuitLayout.from(project.circuit, catalog),
    };
}
