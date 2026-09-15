export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

export function snapToDevicePixel(value: number, pixelRatio: number): number {
    return Math.round(value * pixelRatio) / pixelRatio;
}

export function snapZoomToCellPixels(
    zoom: number,
    cellSize: number,
    pixelRatio: number,
): number {
    const minimumCellPixels = Math.ceil(cellSize * MIN_ZOOM * pixelRatio);

    const maximumCellPixels = Math.floor(cellSize * MAX_ZOOM * pixelRatio);

    const cellPixels = clamp(
        Math.round(cellSize * zoom * pixelRatio),
        minimumCellPixels,
        maximumCellPixels,
    );

    return cellPixels / (cellSize * pixelRatio);
}
