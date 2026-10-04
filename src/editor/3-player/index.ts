// Public API of the player feature.
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { goToTimecodeDirectArgsSchema } from '@/editor/0-core/2-lib/types.ts';
import * as player from './1-actions/player-actions.ts';
import { decreaseVolume, goToTimecode, goToTimecodeDirect, increaseVolume, toggleFullscreenVideo } from './1-actions/video-events.ts';
import './1-actions/video-effects.ts';
import './1-actions/subtitles.ts';
import './1-actions/working-timer.ts';

export { PlayerView } from './3-ui/player-view.tsx';
export { FileHosts } from './3-ui/file-hosts.tsx';
export { NoFileLoaded } from './3-ui/no-file-loaded.tsx';
export { VolumeControl } from './3-ui/volume-control.tsx';
export { PlaybackStreamSelector } from './3-ui/playback-stream-selector.tsx';
export { WorkingOverlay } from './3-ui/working-overlay.tsx';
export { ErrorDialog } from './3-ui/error-dialog.tsx';
export { MediaSourcePlayer } from './3-ui/media-source-player.tsx';
export {
    onDurationChange, onVideoError, goToTimecode, goToTimecodeDirect, toggleFullscreenVideo, setPlaybackVolume, increaseVolume, decreaseVolume,
    incrementMediaSourceQuality,
} from './1-actions/video-events.ts';
export { loadSubtitle, onActiveSubtitleChange } from './1-actions/subtitles.ts';

registerActions({
    togglePlayNoResetSpeed: () => player.togglePlay(),
    togglePlayResetSpeed: () => player.togglePlay({ resetPlaybackRate: true }),
    togglePlayOnlyCurrentSegment: () => player.togglePlay({ resetPlaybackRate: true, requestPlaybackMode: 'play-segment-once' }),
    toggleLoopOnlyCurrentSegment: () => player.togglePlay({ resetPlaybackRate: true, requestPlaybackMode: 'loop-segment' }),
    toggleLoopStartEndOnlyCurrentSegment: () => player.togglePlay({ resetPlaybackRate: true, requestPlaybackMode: 'loop-segment-start-end' }),
    togglePlaySelectedSegments: player.togglePlaySelectedSegments,
    toggleLoopSelectedSegments: player.toggleLoopSelectedSegments,
    play: () => player.play(),
    pause: player.pause,
    reducePlaybackRate: () => player.userChangePlaybackRate(-1),
    reducePlaybackRateMore: () => player.userChangePlaybackRate(-1, 2),
    increasePlaybackRate: () => player.userChangePlaybackRate(1),
    increasePlaybackRateMore: () => player.userChangePlaybackRate(1, 2),
    seekPreviousFrame: () => player.shortStep(-1),
    seekNextFrame: () => player.shortStep(1),
    jumpPrevSegment: () => player.jumpSeg({ rel: -1 }),
    jumpSeekPrevSegment: () => player.jumpSeg({ rel: -1, seek: true }),
    jumpNextSegment: () => player.jumpSeg({ rel: 1 }),
    jumpSeekNextSegment: () => player.jumpSeg({ rel: 1, seek: true }),
    jumpFirstSegment: () => player.jumpSeg({ abs: 0 }),
    jumpSeekFirstSegment: () => player.jumpSeg({ abs: 0, seek: true }),
    jumpLastSegment: () => player.jumpSeg({ abs: Number.MAX_SAFE_INTEGER }),
    jumpSeekLastSegment: () => player.jumpSeg({ abs: Number.MAX_SAFE_INTEGER, seek: true }),
    jumpCutStart: player.jumpCutStart,
    jumpCutEnd: player.jumpCutEnd,
    jumpTimelineStart: player.jumpTimelineStart,
    jumpTimelineEnd: player.jumpTimelineEnd,
    toggleMuted: player.toggleMuted,
    increaseVolume,
    decreaseVolume,
    goToTimecode: () => goToTimecode(),
    goToTimecodeDirect: (...args: unknown[]) => goToTimecodeDirect(...goToTimecodeDirectArgsSchema.parse(args)),
    toggleFullscreenVideo,
});
