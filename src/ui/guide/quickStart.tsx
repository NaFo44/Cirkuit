import { useState } from "react";
import { ChevronLeft, ChevronRight } from "pixelarticons/react";
import andConnectionsScreenshot from "../../assets/quick-start/and-connections.png";
import rotationScreenshot from "../../assets/quick-start/rotation.png";
import runCircuitScreenshot from "../../assets/quick-start/run-circuit.png";
import "./quickStart.css";

interface QuickStartSlide {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly screenshot: string;
    readonly screenshotAlt: string;
}

const QUICK_START_SLIDES: readonly QuickStartSlide[] = [
    {
        id: "run",
        title: "Run your circuit",
        description:
            "Press Run to start the simulation, then click switches to toggle them.",
        screenshot: runCircuitScreenshot,
        screenshotAlt: "The Run button",
    },
    {
        id: "rotation",
        title: "Rotate components",
        description:
            "Select a gate and press R to rotate it before placing it.",
        screenshot: rotationScreenshot,
        screenshotAlt: "A component being rotated",
    },
    {
        id: "and-connections",
        title: "Connect an AND gate",
        description:
            "Its inputs are on the left and top. Its output is on the right.",
        screenshot: andConnectionsScreenshot,
        screenshotAlt: "An AND gate connected from the left and top",
    },
];

export function QuickStart() {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hasNavigated, setHasNavigated] = useState(false);

    const currentSlide = QUICK_START_SLIDES[currentSlideIndex];
    const slideAnimationClass = hasNavigated
        ? " quick-start__slide-part--animated"
        : "";

    const showPreviousSlide = () => {
        setHasNavigated(true);
        setCurrentSlideIndex(
            (currentIndex) =>
                (currentIndex - 1 + QUICK_START_SLIDES.length) %
                QUICK_START_SLIDES.length,
        );
    };

    const showNextSlide = () => {
        setHasNavigated(true);
        setCurrentSlideIndex(
            (currentIndex) => (currentIndex + 1) % QUICK_START_SLIDES.length,
        );
    };

    return (
        <aside
            className={`quick-start${isCollapsed ? " quick-start--collapsed" : ""}`}
            aria-label="Quick start guide"
        >
            <div
                id="quick-start-panel"
                className="quick-start__panel"
                aria-hidden={isCollapsed}
                inert={isCollapsed}
            >
                <h1 className="quick-start__brand">CIRKUIT</h1>
                <div className="quick-start__content">
                    <header className="quick-start__header">
                        <h2>Quick start</h2>

                        <span className="quick-start__counter">
                            {currentSlideIndex + 1} /{" "}
                            {QUICK_START_SLIDES.length}
                        </span>
                    </header>

                    <section
                        className="quick-start__slide"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        <div className="quick-start__media">
                            <div
                                key={currentSlide.id}
                                className={`quick-start__slide-visual${slideAnimationClass}`}
                            >
                                <img
                                    className="quick-start__screenshot"
                                    src={currentSlide.screenshot}
                                    alt={currentSlide.screenshotAlt}
                                    draggable={false}
                                />
                            </div>

                            <button
                                type="button"
                                className="quick-start__navigation quick-start__navigation--previous"
                                aria-label="Previous tip"
                                onClick={showPreviousSlide}
                            >
                                <ChevronLeft aria-hidden="true" />
                            </button>

                            <button
                                type="button"
                                className="quick-start__navigation quick-start__navigation--next"
                                aria-label="Next tip"
                                onClick={showNextSlide}
                            >
                                <ChevronRight aria-hidden="true" />
                            </button>
                        </div>

                        <div
                            key={currentSlide.id}
                            className={`quick-start__slide-copy${slideAnimationClass}`}
                        >
                            <h3>{currentSlide.title}</h3>
                            <p>{currentSlide.description}</p>
                        </div>
                    </section>

                    <div className="quick-start__dots" aria-hidden="true">
                        {QUICK_START_SLIDES.map((slide, index) => (
                            <span
                                key={slide.id}
                                className={
                                    index === currentSlideIndex
                                        ? "quick-start__dot quick-start__dot--active"
                                        : "quick-start__dot"
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>

            <button
                type="button"
                className="quick-start__toggle"
                aria-controls="quick-start-panel"
                aria-expanded={!isCollapsed}
                aria-label={
                    isCollapsed
                        ? "Open quick start guide"
                        : "Hide quick start guide"
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
