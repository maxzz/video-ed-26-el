import type { CSSProperties, FocusEvent } from 'react';
import { useAtomValue } from 'jotai';
import { VideoIcon } from 'lucide-react';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { cn } from '@/utils/classnames';
import { compatCanvasElementAtom, compatLoadingAtom, compatShowCanvasAtom, compatVideoElementAtom, effectiveRotationAtom } from '../9-state/player-atoms.ts';
import '../7-actions/compat-player.ts';

const setCompatVideo = (el: HTMLVideoElement | null) => { appStore.set(compatVideoElementAtom, el); };
const setCompatCanvas = (el: HTMLCanvasElement | null) => { appStore.set(compatCanvasElementAtom, el); };

// prevent video element from stealing focus in fullscreen mode https://github.com/mifi/lossless-cut/issues/543#issuecomment-1868167775
const blurOnFocus = (e: FocusEvent<HTMLVideoElement>) => e.target.blur();

const onCompatVideoError = (error: unknown) => console.error('video error', error);

/** Port of upstream MediaSourcePlayer. The streaming logic lives in 7-actions/compat-player.ts */
export function MediaSourcePlayer() {
    const rotate = useAtomValue(effectiveRotationAtom);
    const loading = useAtomValue(compatLoadingAtom);
    const showCanvas = useAtomValue(compatShowCanvasAtom);

    const rotateStyle: CSSProperties | undefined = rotate ? { transform: `rotate(${rotate}deg)` } : undefined;

    return (
        <div className="absolute inset-0 size-full bg-black overflow-hidden pointer-events-none">
            <video
                ref={setCompatVideo}
                className={cn('absolute inset-0 size-full block object-contain', showCanvas && 'invisible')}
                style={rotateStyle}
                playsInline
                tabIndex={-1}
                onError={onCompatVideoError}
                onFocusCapture={blurOnFocus}
            />
            <canvas
                ref={setCompatCanvas}
                className={cn('absolute inset-0 size-full object-contain', showCanvas ? 'block' : 'hidden')}
                style={rotateStyle}
            />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <VideoIcon className="p-3 size-12 text-white bg-black/20 animate-pulse rounded-full" />
                </div>
            )}
        </div>
    );
}
