import {
    Clock,
    Lightbulb,
    Zap,
    Plug,
    Switch as SwitchIcon,
    Gps,
} from "pixelarticons/react";
import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/builtInComponents";
import type { Rotation } from "../../domain/circuit/placedComponent";
import { NotGateIcon } from "./notGateIcon";
import { AndGateIcon } from "./andGateIcon";

type PixelIcon = typeof Lightbulb;

const COMPONENT_ICONS: Record<BuiltInComponentType, PixelIcon> = {
    source: Zap,
    clock: Clock,
    light: Lightbulb,
    wire: Plug,
    switch: SwitchIcon,
    not: NotGateIcon,
    and: AndGateIcon,
    via: Gps,
};

interface ComponentGlyphProps {
    componentType: string;
    size?: number;
    rotation?: Rotation;
}

export function ComponentGlyph({
    componentType,
    size,
    rotation = 0,
}: ComponentGlyphProps) {
    if (!isBuiltInComponentType(componentType)) {
        return null;
    }

    const Icon = COMPONENT_ICONS[componentType];

    return (
        <Icon
            className="component-glyph"
            width={size}
            height={size}
            style={{
                transform: `rotate(${rotation}deg)`,
            }}
            aria-hidden="true"
        />
    );
}
