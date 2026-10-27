import { useState } from "react";
import { CircuitLayout } from "../../domain/circuit/circuitLayout";
import { ModuleCatalog } from "../../domain/circuit/modules/moduleCatalog";
import { updateProjectModules } from "../../domain/project/updateProjectModules";
import type { ComponentFootprint } from "../../domain/circuit/componentDefinition";
import type { Direction } from "../../domain/circuit/direction";
import {
    createModuleDefinitionFromDraft,
    findFreeDraftPortSlot,
    getDraftBodyError,
    getModuleWireReference,
    suggestDraftPortName,
    type DraftPortKind,
} from "../../domain/circuit/modules/moduleDraftConfiguration";

import type {
    CircuitProject,
    ProjectViewport,
} from "../../domain/project/circuitProject";
import { useProjectEditor } from "../project/useProjectEditor";
import {
    createModuleDraftProject,
    suggestModuleDraftName,
    type ModuleDraft,
} from "../../domain/circuit/modules/moduleDraft";

export function useModuleDraftWorkspace(
    createMainProject: () => CircuitProject,
) {
    const mainEditor = useProjectEditor(createMainProject);
    const draftEditor = useProjectEditor(createModuleDraftProject);

    const [draft, setDraft] = useState<ModuleDraft | null>(null);
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const isDraft = draft !== null;
    const [mainView, setMainView] = useState<"main" | "modules">("main");

    function openDraft(viewport: ProjectViewport) {
        if (isDraft) {
            return;
        }

        mainEditor.endPaint();
        mainEditor.updateViewport(viewport);

        draftEditor.replaceProject(createModuleDraftProject());
        setEditingModuleId(null);
        setDraft({
            id: crypto.randomUUID(),
            name: suggestModuleDraftName(mainEditor.project.modules),
            footprint: { width: 5, height: 5 },
            ports: [],
        });
    }

    function openModule(id: string, viewport: ProjectViewport): string | null {
        if (isDraft) return "Return to the main circuit first.";
        const definition = mainEditor.project.modules.find(
            (module) => module.id === id,
        );
        if (!definition) return "This module no longer exists.";
        const registry = mainEditor.project.circuit.registry;
        const primitives =
            registry instanceof ModuleCatalog
                ? registry.primitiveCatalog
                : registry;
        const copy = new ModuleCatalog([definition], primitives).getModule(id);
        const project = {
            ...createModuleDraftProject(),
            circuit: CircuitLayout.from(copy.circuit, primitives),
            annotations: copy.annotations,
        };
        mainEditor.endPaint();
        mainEditor.updateViewport(viewport);
        draftEditor.replaceProject(project);
        setDraft({
            id: copy.id,
            name: copy.name,
            footprint: copy.footprint,
            ports: copy.ports,
        });
        setEditingModuleId(id);
        return null;
    }

    function openMain() {
        if (!isDraft) {
            return;
        }

        closeModuleEditor();
    }

    function renameDraft(name: string) {
        setDraft((current) => (current ? { ...current, name } : current));
    }

    function resizeDraft(footprint: ComponentFootprint): string | null {
        if (!draft) return "No module is being edited.";
        const error = getDraftBodyError(footprint, draft.ports);
        if (error) return error;
        setDraft({ ...draft, footprint: { ...footprint } });
        return null;
    }

    function addPort(kind: DraftPortKind, componentId: string) {
        const reference = getModuleWireReference(
            draftEditor.project.circuit,
            componentId,
        );
        if (!draft || !reference) {
            return {
                error: "Choose a wire cell.",
                portId: null,
            };
        }
        const slot = findFreeDraftPortSlot(draft, kind);
        if (!slot)
            return {
                error: "No free border cell. Increase the body size first.",
                portId: null,
            };
        const portId = crypto.randomUUID();
        setDraft({
            ...draft,
            ports: [
                ...draft.ports,
                {
                    id: portId,
                    name: suggestDraftPortName(draft, kind),
                    kind,
                    ...slot,
                    internalPort: { ...reference },
                },
            ],
        });
        return { error: null, portId };
    }

    function renamePort(id: string, name: string) {
        setDraft((current) =>
            current
                ? {
                      ...current,
                      ports: current.ports.map((port) =>
                          port.id === id ? { ...port, name } : port,
                      ),
                  }
                : current,
        );
    }

    function removePort(id: string) {
        setDraft((current) =>
            current
                ? {
                      ...current,
                      ports: current.ports.filter((port) => port.id !== id),
                  }
                : current,
        );
    }

    function movePort(
        id: string,
        side: Direction,
        offset: number,
    ): string | null {
        if (!draft || !draft.ports.some((port) => port.id === id))
            return "Choose a port first.";
        const ports = draft.ports.map((port) =>
            port.id === id ? { ...port, side, offset } : port,
        );
        const error = getDraftBodyError(draft.footprint, ports);
        if (error) return error;
        setDraft({ ...draft, ports });
        return null;
    }

    function reconnectPort(id: string, componentId: string): string | null {
        const reference = getModuleWireReference(
            draftEditor.project.circuit,
            componentId,
        );
        if (!draft || !reference) {
            return "Choose a wire cell.";
        }
        if (!draft.ports.some((port) => port.id === id))
            return "This public port no longer exists.";
        setDraft({
            ...draft,
            ports: draft.ports.map((port) =>
                port.id === id
                    ? { ...port, internalPort: { ...reference } }
                    : port,
            ),
        });
        return null;
    }

    function publishDraft(): string | null {
        if (!draft) return "No module is being edited.";
        try {
            const definition = createModuleDefinitionFromDraft(
                draft,
                draftEditor.project,
            );
            const exists = mainEditor.project.modules.some(
                (module) => module.id === definition.id,
            );
            if (editingModuleId && !exists) {
                return "This module no longer exists in the main project.";
            }
            if (!editingModuleId && exists) {
                return "A module with this identifier already exists.";
            }
            const modules = editingModuleId
                ? mainEditor.project.modules.map((module) =>
                      module.id === editingModuleId ? definition : module,
                  )
                : [...mainEditor.project.modules, definition];
            // Validate every placed instance before scheduling the React update.
            try {
                updateProjectModules(mainEditor.project, modules);
            } catch {
                return "Cannot save: an existing instance would overlap another component or extend outside the grid. Adjust the body size or move the affected instances in the main circuit.";
            }
            draftEditor.endPaint();
            mainEditor.updateModules(modules);
            closeModuleEditor();
            return null;
        } catch (error) {
            return error instanceof Error
                ? error.message
                : "Could not create the module.";
        }
    }

    function closeModuleEditor() {
        draftEditor.endPaint();
        draftEditor.replaceProject(createModuleDraftProject());
        setDraft(null);
        setEditingModuleId(null);
        setMainView("modules");
    }

    function replaceProject(project: CircuitProject) {
        mainEditor.endPaint();
        draftEditor.endPaint();
        mainEditor.replaceProject(project);
        draftEditor.replaceProject(createModuleDraftProject());

        setDraft(null);
        setEditingModuleId(null);
        setMainView("main");
    }

    return {
        editor: isDraft ? draftEditor : mainEditor,
        draft,
        editingModuleId,
        isDraft,
        mainView,
        openDraft,
        openModule,
        openMain,
        renameDraft,
        resizeDraft,
        addPort,
        renamePort,
        removePort,
        movePort,
        reconnectPort,
        publishDraft,
        replaceProject,
    };
}
