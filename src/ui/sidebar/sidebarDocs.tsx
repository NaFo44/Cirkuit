import "./workspaceSidebar.css";
import "./sidebarDocs.css";

interface SidebarDocsProps {
    readonly onClose: () => void;
}

interface ComponentCardProps {
    readonly imageUrl: string;
    readonly title: string;
    readonly description: string;
}

function ComponentCard({ imageUrl, title, description }: ComponentCardProps) {
    return (
        <div className="component-card">
            <h2 className="component-card--title">{title}</h2>
            <img className="component-card--image" src={imageUrl} />
            <p className="component-card--description">{description}</p>
        </div>
    );
}

export function SidebarDocs({ onClose }: SidebarDocsProps) {
    return (
        <section className="sidebar-docs" aria-labelledby="sidebar-docs-title">
            <button
                type="button"
                className="sidebar-docs__back"
                onClick={onClose}
            >
                Back to workspace
            </button>

            <h1 id="sidebar-docs-title" className="workspace-sidebar__brand">
                Docs
            </h1>

            <p className="sidebar-docs__introduction">
                Hey! Welcome to the docs. Here you'll find a description of how
                to use each component.
            </p>

            <div>
                <ComponentCard
                    title="Wire"
                    imageUrl="./Cirkuit/src/assets/docs/wire.png"
                    description="THE most basic component! You can connect a wire from all sides. It does not conduct electricity through layers, though."
                />
                <ComponentCard
                    title="Via"
                    imageUrl="./Cirkuit/src/assets/docs/via.png"
                    description="Really useful one! You can use a via basically like a wire, except it can conduct electricity through layers!"
                />
                <ComponentCard
                    title="Source"
                    imageUrl="./Cirkuit/src/assets/docs/source.png"
                    description="Basic component: it just powers your circuits from all sides (HIGH signal)."
                />
                <ComponentCard
                    title="Light"
                    imageUrl="./Cirkuit/src/assets/docs/light.png"
                    description="Light! It can be powered from all sides. It does not conduct electricity."
                />
                <ComponentCard
                    title="Switch"
                    imageUrl="./Cirkuit/src/assets/docs/switch.png"
                    description="It's basically like a wire, but you can switch its conductivity on and off! It can conduct power from all sides."
                />
                <ComponentCard
                    title="NOT gate"
                    imageUrl="./Cirkuit/src/assets/docs/not.png"
                    description="It reverses the signal you give it. It has one input (on the left) and one output (on the right). For example, if I input a 'LOW' signal, it will output 'HIGH'. One subtle thing: if you input a 'floating' signal, it will return 'HIGH'."
                />
                <ComponentCard
                    title="AND gate"
                    imageUrl="./Cirkuit/src/assets/docs/and.png"
                    description="This component has two inputs (on the top and on the left), and one output (on the right). It returns HIGH only when the two inputs are HIGH."
                />
            </div>
        </section>
    );
}
