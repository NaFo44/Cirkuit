import { useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "pixelarticons/react";

import "./workspaceSidebar.css";

interface WorkspaceSidebarContainerProps {
    readonly children: ReactNode;
    readonly showDecoration?: boolean;
}

export function WorkspaceSidebarContainer({
    children,
    showDecoration = true,
}: WorkspaceSidebarContainerProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const panelId = useId();

    return (
        <aside
            className={[
                "workspace-sidebar",
                isCollapsed ? "workspace-sidebar--collapsed" : "",
                showDecoration ? "workspace-sidebar--decorated" : "",
            ]
                .filter(Boolean)
                .join(" ")}
            aria-label="Workspace"
        >
            <div
                id={panelId}
                className="workspace-sidebar__panel"
                aria-hidden={isCollapsed}
                inert={isCollapsed}
            >
                {children}
            </div>

            <button
                type="button"
                className="workspace-sidebar__toggle"
                aria-controls={panelId}
                aria-expanded={!isCollapsed}
                aria-label={
                    isCollapsed
                        ? "Show workspace panel"
                        : "Hide workspace panel"
                }
                onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            >
                {isCollapsed ? (
                    <ChevronRight aria-hidden="true" />
                ) : (
                    <ChevronLeft aria-hidden="true" />
                )}
            </button>
        </aside>
    );
}
