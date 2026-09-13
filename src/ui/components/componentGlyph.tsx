import { Lightbulb, Zap, Plug } from "pixelarticons/react";
import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";

type PixelIcon = typeof Lightbulb;

const COMPONENT_ICONS: Partial<Record<BuiltInComponentType, PixelIcon>> = {
    source: Zap,
    light: Lightbulb,
    wire: Plug,
};

interface ComponentGlyphProps {
    componentType: string;
    size?: number;
}

export function ComponentGlyph({ componentType, size }: ComponentGlyphProps) {
    if (!isBuiltInComponentType(componentType)) {
        return null;
    }

    const Icon = COMPONENT_ICONS[componentType];

    if (!Icon) {
        return null;
    }

    return (
        <Icon
            className="component-glyph"
            width={size}
            height={size}
            aria-hidden="true"
        />
    );
}
