import { atom, useAtomValue } from "jotai";
import { unwrap } from "jotai/utils";
import i18n from "i18next";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { handleError } from "@/editor/0-core/9-state/working";
import { UserFacingError } from "@/editor/0-core/8-lib/9-error-types";
import { extractSrtGpsTrack } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg";
import { parseDjiGps1, parseDjiGps2 } from "@/editor/9-closed-captions/8-lib/edl-formats";

// Port of upstream components/GpsMap.tsx. https://www.openstreetmap.org/copyright

// limit number of points, or else severe map slowdown
const maxPointsToShow = 500;

async function getGpsTrack({ filePath, streamIndex }: { filePath: string; streamIndex: number; }) {
    const subtitles = await extractSrtGpsTrack(filePath, streamIndex);
    return subtitles.flatMap((subtitle) => {
        const { index } = subtitle;
        if (index == null) return [];

        const parsed = parseDjiGps1(subtitle.lines) ?? parseDjiGps2(subtitle.lines);
        if (parsed == null) return [];

        return [{ ...parsed, index, raw: subtitle.lines }];
    });
}

type GpsPoints = Awaited<ReturnType<typeof getGpsTrack>>;

async function loadGpsPoints(filePath: string, streamIndex: number): Promise<GpsPoints | undefined> {
    try {
        const allGpsPoints = await getGpsTrack({ filePath, streamIndex });
        const gpsPoints = allGpsPoints.length > maxPointsToShow
            ? Array.from({ length: maxPointsToShow }).flatMap((_, i) => {
                const p = allGpsPoints[Math.floor(i * (allGpsPoints.length / maxPointsToShow))];
                return p != null ? [p] : [];
            })
            : allGpsPoints;
        if (gpsPoints.length === 0) throw new UserFacingError(i18n.t('No GPS points found'));
        return gpsPoints;
    } catch (err) {
        handleError({ err });
        return undefined;
    }
}

const gpsTrackAtoms = new Map<string, ReturnType<typeof createGpsTrackAtom>>();

function createGpsTrackAtom(filePath: string, streamIndex: number) {
    return unwrap(atom(() => loadGpsPoints(filePath, streamIndex)), () => undefined);
}

function getGpsTrackAtom(filePath: string, streamIndex: number) {
    const key = `${streamIndex}:${filePath}`;
    let a = gpsTrackAtoms.get(key);
    if (!a) {
        a = createGpsTrackAtom(filePath, streamIndex);
        gpsTrackAtoms.set(key, a);
    }
    return a;
}

export function GpsMap({ filePath, streamIndex }: { filePath: string; streamIndex: number; }) {
    const points = useAtomValue(getGpsTrackAtom(filePath, streamIndex));
    const firstPoint = points?.[0];

    if (points == null || firstPoint == null) return null;

    return (
        <div className="w-[80vw] h-[60vh]">
            <MapContainer className="size-full" center={[firstPoint.lat, firstPoint.lng]} zoom={16}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {points.map((point, i) => (
                    <CircleMarker key={point.index} center={[point.lat, point.lng]} radius={5} pathOptions={{ color: '#af0e0e', fillOpacity: 0.8 }}>
                        <Popup>
                            <div>Point {i + 1} / {points.length}</div>
                            {point.raw}
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}
