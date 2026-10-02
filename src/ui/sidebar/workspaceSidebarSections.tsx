import "./workspaceSidebarSections.css";

interface WorkspaceIntroductionProps {
    readonly onOpenDocs?: () => void;
}

export function WorkspaceIntroduction({
    onOpenDocs,
}: WorkspaceIntroductionProps) {
    return (
        <section className="workspace-introduction">
            <p className="workspace-introduction__welcome">
                Hi there! Welcome to Cirkuit.
            </p>

            <p className="workspace-introduction__presentation">
                Cirkuit is a sandbox game where you can build pretty much
                anything using just wires and two basic logic gates.
            </p>

            {onOpenDocs && (
                <p>
                    Check out the component documentation{" "}
                    <button
                        type="button"
                        className="workspace-introduction__docs-link"
                        onClick={onOpenDocs}
                    >
                        here
                    </button>
                    .
                </p>
            )}
        </section>
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
