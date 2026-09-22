import { useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "pixelarticons/react";

import "./workspaceSidebar.css";

interface WorkspaceSidebarProps {
    readonly children: ReactNode;
    readonly topContent?: ReactNode;
    readonly bottomContent?: ReactNode;
    readonly footer?: ReactNode;
}

export function WorkspaceSidebar({
    children,
    topContent,
    bottomContent,
    footer,
}: WorkspaceSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const panelId = useId();

    return (
        <aside
            className={`workspace-sidebar${
                isCollapsed ? " workspace-sidebar--collapsed" : ""
            }`}
            aria-label="Workspace"
        >
            <div
                id={panelId}
                className="workspace-sidebar__panel"
                aria-hidden={isCollapsed}
                inert={isCollapsed}
            >
                <h1 className="workspace-sidebar__brand">CIRKUIT</h1>

                <div className="workspace-sidebar__content">
                    <div className="workspace-sidebar__content-top">
                        {topContent}
                    </div>

                    <div className="workspace-sidebar__content-center">
                        {children}
                    </div>

                    <div className="workspace-sidebar__content-bottom">
                        {bottomContent}
                    </div>

                    {footer && (
                        <footer className="workspace-sidebar__footer">
                            {footer}
                        </footer>
                    )}
                </div>
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
