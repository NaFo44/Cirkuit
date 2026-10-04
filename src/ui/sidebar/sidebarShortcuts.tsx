import type { EditorMode } from "../editor/editorMode";

import "./workspaceSidebar.css";
import "./sidebarShortcuts.css";

interface SidebarShortcutsProps {
    readonly mode: EditorMode;
    readonly onClose: () => void;
}

interface Shortcut {
    readonly input: string;
    readonly action: string;
}

const COMMON_SHORTCUTS: readonly Shortcut[] = [
    {
        input: "Pinch / wheel",
        action: "Zoom",
    },
    {
        input: "Right / middle drag",
        action: "Pan",
    },
];

const MODE_SHORTCUTS: Readonly<Record<EditorMode, readonly Shortcut[]>> = {
    edit: [
        {
            input: "Left drag",
            action: "Draw",
        },
        {
            input: "R",
            action: "Rotate",
        },
        {
            input: "S + drag",
            action: "Select",
        },
        {
            input: "Ctrl+C / V",
            action: "Copy / paste",
        },
    ],
    simulate: [
        {
            input: "Click",
            action: "Toggle switch",
        },
    ],
};

export function SidebarShortcuts({ mode, onClose }: SidebarShortcutsProps) {
    const shortcuts = [...MODE_SHORTCUTS[mode], ...COMMON_SHORTCUTS];

    return (
        <section
            className="workspace-sidebar__page sidebar-shortcuts"
            aria-labelledby="sidebar-shortcuts-title"
        >
            <button
                type="button"
                className="workspace-sidebar__back"
                onClick={onClose}
            >
                Back to workspace
            </button>

            <h1
                id="sidebar-shortcuts-title"
                className="workspace-sidebar__brand workspace-sidebar__page-title"
            >
                Shortcuts
            </h1>

            <ul className="sidebar-shortcuts__list">
                {shortcuts.map((shortcut) => (
                    <li
                        key={shortcut.input}
                        className="sidebar-shortcuts__item"
                    >
                        <span className="sidebar-shortcuts__input">
                            {shortcut.input}
                        </span>

                        <span className="sidebar-shortcuts__action">
                            {shortcut.action}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
