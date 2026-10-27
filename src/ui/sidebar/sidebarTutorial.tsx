import orSchema from "../../assets/docs/or.png";
import requiredComponents from "../../assets/docs/components.png";
import orCircuit from "../../assets/docs/orcircuit.png";
import orCircuitInteractive from "../../assets/docs/orCircuitInteractive.png";
import moduleButton from "../../assets/docs/moduleButton.png";
import newModule from "../../assets/docs/newModule.png";
import creatingOrModule from "../../assets/docs/creatingOrModule.png";
import footprint from "../../assets/docs/footprint.png";
import finalModule from "../../assets/docs/finalModule.png";

import "./workspaceSidebar.css";
import "./sidebarTutorial.css";

interface SidebarTutorialProps {
    readonly onClose: () => void;
}

interface TutorialImageProps {
    readonly src: string;
    readonly width: number;
    readonly height: number;
    readonly alt: string;
}

function TutorialImage({ src, width, height, alt }: TutorialImageProps) {
    return (
        <a
            className="sidebar-tutorial__image-link"
            href={src}
            target="_blank"
            rel="noopener noreferrer"
        >
            <img
                className="sidebar-tutorial__image"
                src={src}
                width={width}
                height={height}
                alt={alt}
                loading="lazy"
                decoding="async"
            />
        </a>
    );
}

export function SidebarTutorial({ onClose }: SidebarTutorialProps) {
    return (
        <section
            className="workspace-sidebar__page sidebar-tutorial"
            aria-labelledby="sidebar-tutorial-title"
        >
            <button
                type="button"
                className="workspace-sidebar__back"
                onClick={onClose}
            >
                Back to workspace
            </button>

            <h1
                id="sidebar-tutorial-title"
                className="workspace-sidebar__brand workspace-sidebar__page-title"
            >
                Tutorial
            </h1>

            <p>
                Welcome to the tutorial! In this short tutorial I'll explain how
                to create your own small circuit really easily, and how to embed
                it into a module.
            </p>

            <section
                className="sidebar-tutorial__section"
                aria-labelledby="tutorial-building-title"
            >
                <h2 id="tutorial-building-title">Building your own circuit</h2>
                <p>
                    For this tutorial we will create an OR logic gate! This
                    component outputs true (high) if any of its inputs are true
                    (high); otherwise, it outputs false (low).
                </p>

                <ol className="sidebar-tutorial__steps">
                    <li className="sidebar-tutorial__step">
                        <p>Here is a schematic of this gate:</p>
                        <TutorialImage
                            src={orSchema}
                            width={987}
                            height={412}
                            alt="or gate schema"
                        />
                    </li>
                    <li className="sidebar-tutorial__step">
                        <p>
                            So we need: 3 NOT gates, and 1 AND gate. Let's start
                            building it! The components we need are located here
                            on the sidebar:
                        </p>
                        <TutorialImage
                            src={requiredComponents}
                            width={867}
                            height={577}
                            alt="required components"
                        />
                    </li>
                    <li className="sidebar-tutorial__step">
                        <p>
                            Now you can select the components and place them on
                            the grid. Here is how it should look like:
                        </p>
                        <TutorialImage
                            src={orCircuit}
                            width={967}
                            height={460}
                            alt="or circuit"
                        />
                    </li>
                    <li className="sidebar-tutorial__step">
                        <p>
                            You can add 2 sources, 2 switches, and one light to
                            try the gate, like this:
                        </p>
                        <TutorialImage
                            src={orCircuitInteractive}
                            width={1177}
                            height={527}
                            alt="or circuit with switches"
                        />
                    </li>
                </ol>
            </section>

            <section
                className="sidebar-tutorial__section"
                aria-labelledby="tutorial-module-title"
            >
                <h2 id="tutorial-module-title">Creating a module</h2>
                <p>
                    Your OR gate is now up and running! But for more complex
                    circuits (like the XOR gate) it can rapidly take a lot of
                    space. That's why you can embed circuit into modules! Let's
                    create one for our OR gate.
                </p>

                <ol className="sidebar-tutorial__steps">
                    <li className="sidebar-tutorial__step">
                        <p>First, open the "Module" section:</p>
                        <TutorialImage
                            src={moduleButton}
                            width={1287}
                            height={667}
                            alt="module button"
                        />
                    </li>
                    <li className="sidebar-tutorial__step">
                        <p>Then click on "New module":</p>
                        <TutorialImage
                            src={newModule}
                            width={590}
                            height={595}
                            alt="new module button"
                        />
                    </li>
                    <li className="sidebar-tutorial__step">
                        <p>
                            Congrats! You just opened the darkest place of this
                            website.
                        </p>
                        <p>
                            The next step is simple: just draw your circuit on
                            the grid, that's it.
                        </p>
                        <p>
                            Once it's done, you'll have to attribute the input
                            and outputs of your module. To do this, you just
                            have to click on "Add input" or "Add output", and
                            then select the wire component you want.
                        </p>
                        <p>It should look like this for our OR gate:</p>
                        <TutorialImage
                            src={creatingOrModule}
                            width={1557}
                            height={801}
                            alt="creating Or module"
                        />
                    </li>
                    <li className="sidebar-tutorial__step">
                        <p>But now you might be wondering, what is THIS??</p>
                        <TutorialImage
                            src={footprint}
                            width={646}
                            height={392}
                            alt="module footprint"
                        />
                        <p>
                            This is your module footprint! The blue squares are
                            the pins. You can move them and resize your module
                            if you want. Here's how you could end up with
                            something like this:
                        </p>
                        <TutorialImage
                            src={finalModule}
                            width={606}
                            height={255}
                            alt="final module footprint"
                        />
                    </li>
                    <li className="sidebar-tutorial__step">
                        <p>
                            Now click on "Create module", and... That's it! You
                            can now go back to your main circuit, select your
                            "OR" module and place it!
                        </p>
                    </li>
                </ol>
            </section>
        </section>
    );
}
