import {
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from "react";

interface MapViewportProps {
    children: ReactNode;
}

interface Camera {
    x: number;
    y: number;
    zoom: number;
}

interface PanGesture {
    pointerId: number;
    lastX: number;
    lastY: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(Math.max(value, minimum), maximum);
}

export function MapViewport({ children }: MapViewportProps) {
    const [camera, setCamera] = useState<Camera>({
        x: 0,
        y: 0,
        zoom: 1,
    });

    const [isPanning, setIsPanning] = useState(false);
    const panGesture = useRef<PanGesture | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const viewport = viewportRef.current;

        if (!viewport) {
            return;
        }

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();

            const bounds = viewport.getBoundingClientRect();

            const pointerX = event.clientX - bounds.left;
            const pointerY = event.clientY - bounds.top;

            const deltaMultiplier =
                event.deltaMode === WheelEvent.DOM_DELTA_LINE
                    ? 16
                    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                      ? viewport.clientHeight
                      : 1;

            const delta = event.deltaY * deltaMultiplier;
            const zoomFactor = Math.exp(-delta * 0.0015);

            setCamera((currentCamera) => {
                const nextZoom = clamp(
                    currentCamera.zoom * zoomFactor,
                    MIN_ZOOM,
                    MAX_ZOOM,
                );

                const worldX =
                    (pointerX - currentCamera.x) / currentCamera.zoom;
                const worldY =
                    (pointerY - currentCamera.y) / currentCamera.zoom;

                return {
                    zoom: nextZoom,
                    x: pointerX - worldX * nextZoom,
                    y: pointerY - worldY * nextZoom,
                };
            });
        };

        viewport.addEventListener("wheel", handleWheel, {
            passive: false,
        });

        return () => {
            viewport.removeEventListener("wheel", handleWheel);
        };
    }, []);

    const startPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 1 || panGesture.current) {
            return;
        }

        event.preventDefault();

        panGesture.current = {
            pointerId: event.pointerId,
            lastX: event.clientX,
            lastY: event.clientY,
        };

        setIsPanning(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const continuePanning = (event: ReactPointerEvent<HTMLDivElement>) => {
        const gesture = panGesture.current;

        if (!gesture || gesture.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - gesture.lastX;
        const deltaY = event.clientY - gesture.lastY;

        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;

        setCamera((currentCamera) => ({
            ...currentCamera,
            x: currentCamera.x + deltaX,
            y: currentCamera.y + deltaY,
        }));
    };

    const stopPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
        const gesture = panGesture.current;

        if (!gesture || gesture.pointerId !== event.pointerId) {
            return;
        }

        panGesture.current = null;
        setIsPanning(false);

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <div
            ref={viewportRef}
            className={
                isPanning
                    ? "map-viewport map-viewport--panning"
                    : "map-viewport"
            }
            onPointerDown={startPanning}
            onPointerMove={continuePanning}
            onPointerUp={stopPanning}
            onPointerCancel={stopPanning}
            onLostPointerCapture={stopPanning}
            onAuxClick={(event) => {
                if (event.button === 1) {
                    event.preventDefault();
                }
            }}
        >
            <div
                className="map-viewport__content"
                style={{
                    transform: [
                        `translate(${camera.x}px, ${camera.y}px)`,
                        `scale(${camera.zoom})`,
                    ].join(" "),
                }}
            >
                {children}
            </div>
        </div>
    );
}
