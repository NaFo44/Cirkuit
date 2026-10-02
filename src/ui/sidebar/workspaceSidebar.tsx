import type { ReactNode } from "react";

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
    return (
        <>
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
        </>
    );
}
