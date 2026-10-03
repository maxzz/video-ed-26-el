import { blobButtonConfig } from "./4-blob-button-atoms";

/**
 * A superellipse base shape pushed out along its normal by a few broad lumps that drift around it.
 * Inward dents are softly capped (see `dent`), so opposite sides cannot both cave in and pinch the shape thin.
 * The displacement is one smooth field sampled at evenly spaced angles, and a closed Catmull-Rom spline
 * through the samples keeps the curve free of corners.
 */
export function buildOutline(width: number, height: number, time: number, activityLevel: number): string {
    if (!width || !height) {
        return "";
    }

    const { samples, squareness, wobble, dent, endWobble, activeWobble } = blobButtonConfig;
    const n = Math.min(Math.max(Math.round(samples), 8), MAX_SAMPLES);
    const cx = width / 2;
    const cy = height / 2;
    const amplitude = wobble * cy * (1 + (activeWobble - 1) * activityLevel);
    const rx = Math.max(cx - amplitude, 1);
    const ry = Math.max(cy - amplitude, 1);
    const pointExp = 2 / squareness;
    const normalExp = 2 * (squareness - 1) / squareness;
    const dentLimit = Math.max(dent, 0.01);

    for (let j = 0; j < waves.length; j++) {
        const w = waves[j];
        waveWeights[j] = w.weight * (0.65 + 0.35 * Math.sin(time * w.pulse + w.pulsePhase));
        waveOffsets[j] = w.phase - time * w.travel;
    }

    for (let i = 0; i < n; i++) {
        const angle = (i / n) * TAU;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const signX = Math.sign(cos);
        const signY = Math.sign(sin);

        // Superellipse point and the gradient of its implicit equation, which is the outward normal
        const baseX = signX * Math.abs(cos) ** pointExp * rx;
        const baseY = signY * Math.abs(sin) ** pointExp * ry;
        const gradX = signX * Math.abs(cos) ** normalExp / rx;
        const gradY = signY * Math.abs(sin) ** normalExp / ry;
        const gradLength = Math.hypot(gradX, gradY) || 1;

        let wave = 0;
        for (let j = 0; j < waves.length; j++) {
            wave += waveWeights[j] * Math.sin(waves[j].harmonic * angle + waveOffsets[j]);
        }
        // Lumps flatten out as they grow, so a big one landing on an end rounds it instead of drawing it into a point
        const lump = wave >= 0 ? Math.tanh(wave) : dentLimit * Math.tanh(wave / dentLimit);

        // The ends curve tightly, so they take a little less of the lumps than the top and bottom
        const normalX = gradX / gradLength;
        const normalY = gradY / gradLength;
        const depth = amplitude * lump * (endWobble + (1 - endWobble) * normalY * normalY);

        xs[i] = cx + baseX + normalX * depth;
        ys[i] = cy + baseY + normalY * depth;
    }

    let d = `M${xs[0].toFixed(2)},${ys[0].toFixed(2)}`;
    for (let i = 0; i < n; i++) {
        const prev = (i - 1 + n) % n;
        const next = (i + 1) % n;
        const after = (i + 2) % n;

        const c1x = xs[i] + (xs[next] - xs[prev]) / 6;
        const c1y = ys[i] + (ys[next] - ys[prev]) / 6;
        const c2x = xs[next] - (xs[after] - xs[i]) / 6;
        const c2y = ys[next] - (ys[after] - ys[i]) / 6;

        d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${xs[next].toFixed(2)},${ys[next].toFixed(2)}`;
    }
    return d + "Z";
}

/**
 * Whole-number harmonics keep the outline closed. Only low ones, so the lumps stay broad like a cloud's;
 * neighbors travel in opposite directions, so the lumps visibly shift instead of the whole shape rotating.
 */
function createWaves() {
    let state = 0x9e3779b9; // mulberry32 with a fixed seed
    const random = () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return [
        { harmonic: 2, weight: 0.6 },
        { harmonic: 3, weight: 0.55 },
        { harmonic: 4, weight: 0.3 },
    ].map(
        ({ harmonic, weight }, i) => ({
            harmonic,
            weight,
            travel: (0.5 + random() * 0.5) * (i % 2 ? -1 : 1),
            phase: random() * TAU,
            pulse: 0.35 + random() * 0.4,
            pulsePhase: random() * TAU,
        })
    );
}

//---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const MAX_SAMPLES = 96;

const waves = createWaves();
const xs = new Float64Array(MAX_SAMPLES);
const ys = new Float64Array(MAX_SAMPLES);
const waveWeights = new Float64Array(waves.length);
const waveOffsets = new Float64Array(waves.length);
