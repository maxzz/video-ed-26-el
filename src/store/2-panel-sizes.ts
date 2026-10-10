import { type Layout } from "react-resizable-panels";

/** Ids of the editor's left (player + timeline) and right (segments) panels. */
export const mainPanelId = "editor-main";
export const segmentsPanelId = "editor-segments";

/** Default split: the segments list is the narrower column. */
const defaultMainSplit: Layout = {
    [mainPanelId]: 78,
    [segmentsPanelId]: 22,
};

const defaultVertical: Layout = { top: 50, bottom: 50 };

export interface PanelSizes {
    horizontal: Layout;
    vertical: Layout;
}

export function getValidPanelSizes(parsedSizes?: unknown): PanelSizes {
    const sizes = isRecord(parsedSizes) ? parsedSizes : undefined;

    return {
        horizontal: validMainSplit(sizes?.horizontal) ?? defaultMainSplit,
        vertical: validLayout(sizes?.vertical) ?? defaultVertical,
    };
}

function validMainSplit(value: unknown): Layout | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const main = value[mainPanelId];
    const segments = value[segmentsPanelId];
    if (!isPercent(main) || !isPercent(segments)) {
        return undefined;
    }

    return {
        [mainPanelId]: main,
        [segmentsPanelId]: segments,
    };
}

function validLayout(value: unknown): Layout | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const layout: Layout = {};
    for (const [key, size] of Object.entries(value)) {
        if (!isPercent(size)) {
            return undefined;
        }
        layout[key] = size;
    }

    return Object.keys(layout).length > 0 ? layout : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isPercent(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
