import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from "react";
import {
    MAX_ZOOM,
    MIN_ZOOM,
    clamp,
    snapToDevicePixel,
    snapZoomToCellPixels,
} from "./mapViewportMath";

export interface MapViewportHandle {
    getCamera: () => Camera;
}

interface MapViewportProps {
    children: ReactNode;
    cellSize: number;
    initialCamera: Camera;
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

function isPanButton(button: number): boolean {
    return button === 1 || button === 2;
}

export const MapViewport = forwardRef<MapViewportHandle, MapViewportProps>(
    function MapViewport({ children, cellSize, initialCamera }, ref) {
        const [camera, setCamera] = useState<Camera>(initialCamera);

        useImperativeHandle(
            ref,
            () => ({
                getCamera: () => camera,
            }),
            [camera],
        );

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
                    const pixelRatio = window.devicePixelRatio || 1;

                    const targetZoom = clamp(
                        currentCamera.zoom * zoomFactor,
                        MIN_ZOOM,
                        MAX_ZOOM,
                    );

                    const currentRenderedZoom = snapZoomToCellPixels(
                        currentCamera.zoom,
                        cellSize,
                        pixelRatio,
                    );

                    const nextRenderedZoom = snapZoomToCellPixels(
                        targetZoom,
                        cellSize,
                        pixelRatio,
                    );

                    const currentRenderedX = snapToDevicePixel(
                        currentCamera.x,
                        pixelRatio,
                    );

                    const currentRenderedY = snapToDevicePixel(
                        currentCamera.y,
                        pixelRatio,
                    );

                    const worldX =
                        (pointerX - currentRenderedX) / currentRenderedZoom;
                    const worldY =
                        (pointerY - currentRenderedY) / currentRenderedZoom;

                    return {
                        zoom: targetZoom,
                        x: pointerX - worldX * nextRenderedZoom,
                        y: pointerY - worldY * nextRenderedZoom,
                    };
                });
            };

            viewport.addEventListener("wheel", handleWheel, {
                passive: false,
            });

            return () => {
                viewport.removeEventListener("wheel", handleWheel);
            };
        }, [cellSize]);

        const startPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!isPanButton(event.button) || panGesture.current) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

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

        const pixelRatio = window.devicePixelRatio || 1;

        const renderedCamera = {
            x: snapToDevicePixel(camera.x, pixelRatio),
            y: snapToDevicePixel(camera.y, pixelRatio),
            zoom: snapZoomToCellPixels(camera.zoom, cellSize, pixelRatio),
        };

        return (
            <div
                ref={viewportRef}
                className={
                    isPanning
                        ? "map-viewport map-viewport--panning"
                        : "map-viewport"
                }
                onPointerDownCapture={startPanning}
                onPointerMove={continuePanning}
                onPointerUp={stopPanning}
                onPointerCancel={stopPanning}
                onLostPointerCapture={stopPanning}
                onContextMenu={(event) => {
                    event.preventDefault();
                }}
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
                            `translate(${renderedCamera.x}px, ${renderedCamera.y}px)`,
                            `scale(${renderedCamera.zoom})`,
                        ].join(" "),
                    }}
                >
                    {children}
                </div>
            </div>
        );
    },
);
