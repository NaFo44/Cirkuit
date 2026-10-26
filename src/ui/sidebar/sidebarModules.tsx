import type { ModuleDefinition } from "../../domain/circuit/modules/moduleDefinition";
import { MODULE_DRAG_TYPE } from "../../domain/circuit/modules/moduleDrag";
import "./workspaceSidebar.css";
import "./sidebarModules.css";

interface Props {
    readonly modules: readonly ModuleDefinition[];
    readonly selectedModuleId: string | null;
    readonly disabled: boolean;
    readonly onSelect: (id: string) => void;
    readonly onDragStart: (id: string) => void;
    readonly onDragEnd: () => void;
    readonly onClose: () => void;
}

function sortModulesByName(
    modules: readonly ModuleDefinition[],
): ModuleDefinition[] {
    return [...modules].sort((a, b) => a.name.localeCompare(b.name));
}

export function SidebarModules({
    modules,
    selectedModuleId,
    disabled,
    onSelect,
    onDragStart,
    onDragEnd,
    onClose,
}: Props) {
    return (
        <section
            className="workspace-sidebar__page sidebar-modules"
            aria-labelledby="sidebar-modules-title"
        >
            <button
                type="button"
                className="workspace-sidebar__back"
                onClick={onClose}
            >
                Back to workspace
            </button>

            <h1
                id="sidebar-modules-title"
                className="workspace-sidebar__brand workspace-sidebar__page-title"
            >
                Modules
            </h1>

            <p className="sidebar-modules__help">
                {disabled
                    ? "Switch to edit mode to place modules."
                    : "Select a module and click to place. R rotates it; Escape cancels placement."}
            </p>

            {modules.length === 0 ? (
                <p className="sidebar-modules__empty">No modules yet!</p>
            ) : (
                <ul className="sidebar-modules__list">
                    {sortModulesByName(modules).map((module) => (
                        <li key={module.id}>
                            <button
                                type="button"
                                className="sidebar-modules__item"
                                disabled={disabled}
                                draggable={!disabled}
                                aria-pressed={selectedModuleId === module.id}
                                onClick={() => onSelect(module.id)}
                                onDragStart={(event) => {
                                    event.dataTransfer.setData(
                                        MODULE_DRAG_TYPE,
                                        module.id,
                                    );
                                    event.dataTransfer.effectAllowed = "copy";
                                    onDragStart(module.id);
                                }}
                                onDragEnd={onDragEnd}
                            >
                                <span className="sidebar-modules__name">
                                    {module.name}
                                </span>

                                <span className="sidebar-modules__size">
                                    {module.footprint.width} x{" "}
                                    {module.footprint.height} cells
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
