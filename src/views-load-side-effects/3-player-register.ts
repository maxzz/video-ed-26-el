import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { goToTimecodeDirectArgsSchema } from "@/editor/0-core/8-lib/9-types-core";
import * as player from "@/editor/3-player/7-actions/player-actions";
import { decreaseVolume, goToTimecode, goToTimecodeDirect, increaseVolume, toggleFullscreenVideo } from "@/editor/3-player/7-actions/video-events";
import { initVideoEffects } from "@/editor/3-player/7-actions/video-effects";
import { initSubtitleEffects } from "@/editor/3-player/7-actions/subtitles";
import { initWorkingTimer } from "@/editor/3-player/7-actions/working-timer";

export function register_3_player() {
    initVideoEffects();
    initSubtitleEffects();
    initWorkingTimer();

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
}
