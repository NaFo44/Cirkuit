import "./workspaceSidebarSections.css";

export function WorkspaceIntroduction() {
    return (
        <section className="workspace-introduction">
            <p className="workspace-introduction__welcome">
                Hi there! Welcome to Cirkuit.
            </p>

            <p className="workspace-introduction__presentation">
                This website is a sandbox game where you can build basically
                anything using wires and the two most basic logic gates.
            </p>
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
