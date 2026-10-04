import { ChevronRight } from "pixelarticons/react";
import "./workspaceSidebarSections.css";

export function WorkspaceIntroduction() {
    return (
        <section className="workspace-introduction">
            <p className="workspace-introduction__welcome">
                Hi there! Welcome to Cirkuit.
            </p>

            <p className="workspace-introduction__presentation">
                Cirkuit is a sandbox game where you can build pretty much
                anything using just wires and two basic logic gates.
            </p>
        </section>
    );
}

interface WorkspaceNavigationProps {
    readonly onOpenDocs: () => void;
    readonly onOpenShortcuts: () => void;
}

export function WorkspaceNavigation({
    onOpenDocs,
    onOpenShortcuts,
}: WorkspaceNavigationProps) {
    return (
        <nav className="workspace-navigation" aria-label="Help">
            <div className="workspace-navigation__item">
                <span className="workspace-navigation__icon" aria-hidden="true">
                    <ChevronRight />
                </span>
                <button
                    type="button"
                    className="workspace-navigation__button"
                    onClick={onOpenDocs}
                >
                    Component documentation
                </button>
            </div>

            <div className="workspace-navigation__item">
                <span className="workspace-navigation__icon" aria-hidden="true">
                    <ChevronRight />
                </span>
                <button
                    type="button"
                    className="workspace-navigation__button"
                    onClick={onOpenShortcuts}
                >
                    Keyboard shortcuts
                </button>
            </div>
        </nav>
    );
}

export function WorkspaceLinks() {
    return (
        <nav className="workspace-links" aria-label="Project links">
            <a
                href="https://github.com/NaFo44/Cirkuit/"
                target="_blank"
                rel="noopener noreferrer"
            >
                GitHub
            </a>

            <a
                href="https://stardance.hackclub.com/projects/59861"
                target="_blank"
                rel="noopener noreferrer"
            >
                Stardance
            </a>
        </nav>
    );
}
