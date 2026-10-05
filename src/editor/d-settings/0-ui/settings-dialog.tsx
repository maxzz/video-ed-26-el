import { useAtom, useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import { BanIcon, BrushCleaningIcon, CogIcon, FileIcon, FileOutputIcon, FolderIcon, GlobeIcon, KeyboardIcon, ContrastIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import { langNames, type SupportedLanguage } from '@shared/i18n.ts';
import type { CaptureFormat, Config, EnableImportChapters, ModifierKey, TimecodeFormat } from '@shared/types.ts';
import { defaultConfig } from '@shared/default-config.ts';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { getEnableImportChaptersOptions, isStoreBuild } from '@/editor/0-core/8-lib/util.ts';
import { settingsVisibleAtom, showAdvancedSettingsAtom, toggleKeyboardShortcuts } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { getModifierKeyNames } from '@/editor/c-keyboard/index.ts';
import { AppOptions } from '@/components/4-dialogs/8-3-options/1-app-options';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Button } from '@/ui/shadcn/button';
import { Switch } from '@/ui/shadcn/switch';
import { Slider } from '@/ui/shadcn/slider';
import { askForCleanupChoices } from '@/editor/7-export/7-actions/export-actions.ts';
import {
    changeCustomFfPath, clearCustomFfPath, requestTuner, setLanguage,
    setShowAdvancedSettings, toggleExportConfirmEnabled, toggleStoreProjectInWorkingDir,
} from '../7-actions/settings-actions.ts';
import { SectionHeader, SettingRow, SettingSelect } from './settings-rows.tsx';
import { OutDirSelector } from './out-dir-selector.tsx';

// Port of upstream components/Settings.tsx

export function SettingsDialog() {
    const { t } = useTranslation();
    const [open, setOpen] = useAtom(settingsVisibleAtom);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 w-[min(52rem,calc(100vw-2rem))] max-w-none! h-[min(85vh,56rem)] text-xs overflow-hidden gap-0 flex flex-col">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">{t('Settings')}</DialogTitle>
                    <DialogDescription className="text-xs">{t('Hover mouse over buttons in the main interface to see which function they have')}</DialogDescription>
                </DialogHeader>

                <div className="px-4 pb-4 min-h-0 overflow-y-auto flex-1">
                    {open && <SettingsBody />}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SettingsBody() {
    const { t } = useTranslation();
    const s = useSnapshot(userSettings);
    const showAdvancedSettings = useAtomValue(showAdvancedSettingsAtom);

    const timecodeFormatOptions: Record<TimecodeFormat, string> = {
        frameCount: t('Frame counts'),
        seconds: t('Total seconds'),
        timecodeWithDecimalFraction: t('Millisecond fractions'),
        timecodeWithFramesFraction: t('Frame fractions'),
    };

    const modifierKeyNames = getModifierKeyNames();

    const languageOptions: [string, string][] = [
        ['system', t('System language')],
        ...Object.entries(langNames),
    ];

    return (<>
        <SettingRow label={<span className="flex items-center gap-1.5"><GlobeIcon className="size-3.5" /> App language</span>}>
            <SettingSelect
                value={s.language ?? 'system'}
                options={languageOptions}
                onChange={(value) => setLanguage(value === 'system' ? null : value as SupportedLanguage)}
            />
        </SettingRow>

        <SettingRow
            label={t('Show advanced settings')}
            details={!showAdvancedSettings && t('Advanced settings are currently not visible.')}
        >
            <Switch checked={showAdvancedSettings} onCheckedChange={setShowAdvancedSettings} />
        </SettingRow>

        <SettingRow
            label={t('Show export options screen before exporting?')}
            details={t('This gives you an overview of the export and allows you to customise more parameters before exporting, like changing the output file name.')}
        >
            <Switch checked={s.exportConfirmEnabled} onCheckedChange={toggleExportConfirmEnabled} />
        </SettingRow>

        {showAdvancedSettings && (<>
            <SettingRow label={t('Auto save project file?')}>
                <Switch checked={s.autoSaveProjectFile} onCheckedChange={(v) => { userSettings.autoSaveProjectFile = v; }} />
            </SettingRow>

            <SettingRow label={t('Store project file (.llc) in the working directory or next to loaded media file?')}>
                <Button variant="outline" size="sm" disabled={!s.autoSaveProjectFile} onClick={toggleStoreProjectInWorkingDir}>
                    {s.storeProjectInWorkingDir ? <FolderIcon /> : <FileIcon />}
                    {s.storeProjectInWorkingDir ? t('Store in working directory') : t('Store next to media file')}
                </Button>
            </SettingRow>

            <SettingRow
                label={t('Custom FFmpeg directory (experimental)')}
                details={t('This allows you to specify custom FFmpeg and FFprobe binaries to use. Make sure the "ffmpeg" and "ffprobe" executables exist in the same directory, and then select the directory.')}
            >
                {s.customFfPath && <span className="max-w-60 truncate" title={s.customFfPath}>{s.customFfPath}</span>}
                <Button variant="outline" size="sm" onClick={changeCustomFfPath}>
                    <CogIcon />
                    {s.customFfPath ? t('Using external ffmpeg') : t('Using built-in ffmpeg')}
                </Button>
                {s.customFfPath && (
                    <Button variant="ghost" size="icon-sm" title={t('Clear')} onClick={clearCustomFfPath}>
                        <XIcon />
                    </Button>
                )}
            </SettingRow>

            {!isStoreBuild && (
                <SettingRow label={t('Check for updates on startup?')}>
                    <Switch checked={s.enableUpdateCheck} onCheckedChange={(v) => { userSettings.enableUpdateCheck = v; }} />
                </SettingRow>
            )}

            <SettingRow label={t('Allow multiple instances of LosslessCut to run concurrently? (experimental)')}>
                <Switch checked={s.allowMultipleInstances} onCheckedChange={(v) => { userSettings.allowMultipleInstances = v; }} />
            </SettingRow>
        </>)}

        <SectionHeader title={t('Options affecting exported files')} />

        <SettingRow
            label={t('Choose cutting mode: Remove or keep selected segments from video when exporting?')}
            details={s.invertCutSegments
                ? <><b>{t('Remove')}</b>: {t('The video inside segments will be discarded, while the video surrounding them will be kept.')}</>
                : <><b>{t('Keep')}</b>: {t('The video inside segments will be kept, while the video outside will be discarded.')}</>}
        >
            <Button variant="outline" size="sm" onClick={() => { userSettings.invertCutSegments = !userSettings.invertCutSegments; }}>
                <ContrastIcon className={s.invertCutSegments ? 'text-destructive' : undefined} />
                {s.invertCutSegments ? t('Remove') : t('Keep')}
            </Button>
        </SettingRow>

        <SettingRow label={t('Working directory')} details={t('This is where working files and exported files are stored.')}>
            <OutDirSelector />
        </SettingRow>

        {showAdvancedSettings && (<>
            <SettingRow label={t('Set file modification date/time of output files to:')}>
                <SettingSelect
                    value={typeof s.treatOutputFileModifiedTimeAsStart === 'boolean' ? String(s.treatOutputFileModifiedTimeAsStart) : 'disabled'}
                    options={{
                        disabled: t('Current time'),
                        true: t('Source file\'s time plus segment start cut time'),
                        false: t('Source file\'s time minus segment end cut time'),
                    }}
                    onChange={(v) => { userSettings.treatOutputFileModifiedTimeAsStart = v === 'disabled' ? null : v === 'true'; }}
                />
            </SettingRow>

            <SettingRow label={t('Treat source file modification date/time as:')}>
                <SettingSelect
                    disabled={s.treatOutputFileModifiedTimeAsStart == null}
                    value={String(s.treatInputFileModifiedTimeAsStart)}
                    options={{ true: t('Start of video'), false: t('End of video') }}
                    onChange={(v) => { userSettings.treatInputFileModifiedTimeAsStart = v === 'true'; }}
                />
            </SettingRow>
        </>)}

        <SettingRow
            label={t('Keyframe cut mode')}
            details={s.keyframeCut
                ? <><b>{t('Keyframe cut')}</b>: {t('Cut at the preceding keyframe (not accurate time.) Equiv to')}: <code className="px-1 font-mono bg-muted rounded">ffmpeg -ss N -i input.mp4</code></>
                : <><b>{t('Normal cut')}</b>: {t('Accurate time but could leave an empty portion at the beginning of the video. Equiv to')}: <code className="px-1 font-mono bg-muted rounded">ffmpeg -i input -ss N</code></>}
        >
            <Switch checked={s.keyframeCut} onCheckedChange={(v) => { userSettings.keyframeCut = v; }} />
        </SettingRow>

        <SettingRow label={t('Cleanup files after export?')}>
            <Button variant="outline" size="sm" onClick={askForCleanupChoices}>
                <BrushCleaningIcon />
                {t('Change preferences')}
            </Button>
        </SettingRow>

        {showAdvancedSettings && (
            <SettingRow
                label={t('Extract unprocessable tracks to separate files or discard them?')}
                details={t('(data tracks such as GoPro GPS, telemetry etc. are not copied over by default because ffmpeg cannot cut them, thus they will cause the media duration to stay the same after cutting video/audio)')}
            >
                <Button variant="outline" size="sm" onClick={() => { userSettings.autoExportExtraStreams = !userSettings.autoExportExtraStreams; }}>
                    {s.autoExportExtraStreams ? <FileOutputIcon /> : <BanIcon className="text-destructive" />}
                    {s.autoExportExtraStreams ? t('Extract') : t('Discard')}
                </Button>
            </SettingRow>
        )}

        <SectionHeader title={t('Snapshots and frame extraction')} />

        <SettingRow label={t('Snapshot capture format')}>
            <SettingSelect<CaptureFormat>
                value={s.captureFormat}
                options={{ jpeg: 'JPEG', png: 'PNG', webp: 'WEBP' }}
                onChange={(v) => { userSettings.captureFormat = v; }}
            />
        </SettingRow>

        {showAdvancedSettings && (
            <SettingRow
                label={t('Snapshot capture method')}
                details={t('FFmpeg capture method might sometimes capture more correct colors, but the captured snapshot might be off by one or more frames, relative to the preview.')}
            >
                <SettingSelect<Config['captureFrameMethod']>
                    value={s.captureFrameMethod}
                    options={{ videotag: t('HTML video tag'), ffmpeg: t('FFmpeg') }}
                    onChange={(v) => { userSettings.captureFrameMethod = v; }}
                />
            </SettingRow>
        )}

        <SettingRow label={t('Snapshot capture quality')}>
            <Slider
                className="w-48"
                min={1}
                max={1000}
                value={[Math.round(s.captureFrameQuality * 1000)]}
                onValueChange={([v]) => { userSettings.captureFrameQuality = Math.max(Math.min(1, (v ?? 1000) / 1000), 0); }}
            />
            <span className="w-9 text-right tabular-nums">{Math.round(s.captureFrameQuality * 100)}%</span>
        </SettingRow>

        {showAdvancedSettings && (
            <SettingRow
                label={t('File names of extracted video frames')}
                details={t('Note that this only applies when extracting multiple frames. When "Frame number" is selected, frame numbers are relative to the start of the segment (starting from 1).')}
            >
                <SettingSelect<Config['captureFrameFileNameFormat']>
                    value={s.captureFrameFileNameFormat}
                    options={{ timestamp: t('Frame timestamp'), index: t('Frame number') }}
                    onChange={(v) => { userSettings.captureFrameFileNameFormat = v; }}
                />
            </SettingRow>
        )}

        <SectionHeader title={t('Keyboard, mouse and input')} />

        <SettingRow label={t('Keyboard & mouse shortcuts')}>
            <Button variant="outline" size="sm" onClick={toggleKeyboardShortcuts}>
                <KeyboardIcon />
                {t('Keyboard & mouse shortcuts')}
            </Button>
        </SettingRow>

        <ModifierKeySetting text={t('Segment manipulation mouse modifier key')} value={s.segmentMouseModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.segmentMouseModifierKey = v; }} />
        <ModifierKeySetting text={t('Mouse wheel zoom modifier key')} value={s.mouseWheelZoomModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.mouseWheelZoomModifierKey = v; }} />
        <ModifierKeySetting text={t('Mouse wheel frame seek modifier key')} value={s.mouseWheelFrameSeekModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.mouseWheelFrameSeekModifierKey = v; }} />
        <ModifierKeySetting text={t('Mouse wheel keyframe seek modifier key')} value={s.mouseWheelKeyframeSeekModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.mouseWheelKeyframeSeekModifierKey = v; }} />

        <TunerSetting text={t('Timeline trackpad/wheel sensitivity')} onClick={() => requestTuner('wheelSensitivity')} />
        <TunerSetting text={t('Timeline keyboard seek interval')} onClick={() => requestTuner('keyboardNormalSeekSpeed')} />
        <TunerSetting text={t('Timeline keyboard seek interval (longer)')} onClick={() => requestTuner('keyboardSeekSpeed2')} />
        <TunerSetting text={t('Timeline keyboard seek interval (longest)')} onClick={() => requestTuner('keyboardSeekSpeed3')} />
        <TunerSetting text={t('Timeline keyboard seek acceleration')} onClick={() => requestTuner('keyboardSeekAccFactor')} />

        <SettingRow label={t('Invert timeline trackpad/wheel direction?')}>
            <Switch checked={s.invertTimelineScroll ?? false} onCheckedChange={(v) => { userSettings.invertTimelineScroll = v; }} />
        </SettingRow>

        <SectionHeader title={t('User interface')} />

        {showAdvancedSettings && (<>
            <SettingRow label={t('Remember window size and position')}>
                <Switch checked={s.storeWindowBounds} onCheckedChange={(v) => { userSettings.storeWindowBounds = v; }} />
            </SettingRow>

            <SettingRow label={t('Waveform height')}>
                <Slider
                    className="w-48"
                    min={20}
                    max={1000}
                    value={[s.waveformHeight]}
                    onValueChange={([v]) => { userSettings.waveformHeight = v ?? defaultConfig.waveformHeight; }}
                />
                <span className="w-9 text-right tabular-nums">{s.waveformHeight}</span>
                <Button variant="ghost" size="icon-sm" title={t('Default')} onClick={() => { userSettings.waveformHeight = defaultConfig.waveformHeight; }}>
                    <RotateCcwIcon />
                </Button>
            </SettingRow>

            <SettingRow label={t('Auto load timecode from file as an offset in the timeline?')}>
                <Switch checked={s.autoLoadTimecode} onCheckedChange={(v) => { userSettings.autoLoadTimecode = v; }} />
            </SettingRow>

            <SettingRow label={t('Try to automatically convert to supported format when opening unsupported file?')}>
                <Switch checked={s.enableAutoHtml5ify} onCheckedChange={(v) => { userSettings.enableAutoHtml5ify = v; }} />
            </SettingRow>
        </>)}

        <SettingRow label={t('Prefer strong colors')}>
            <Switch checked={s.preferStrongColors} onCheckedChange={(v) => { userSettings.preferStrongColors = v; }} />
        </SettingRow>

        <SettingRow label={t('Reduce motion in user interface')}>
            <SettingSelect<Config['reducedMotion']>
                value={s.reducedMotion}
                options={{ user: t('System default'), always: t('Yes'), never: t('No') }}
                onChange={(v) => { userSettings.reducedMotion = v; }}
            />
        </SettingRow>

        <SettingRow label={t('In timecode show')}>
            <SettingSelect<TimecodeFormat>
                value={s.timecodeFormat}
                options={timecodeFormatOptions}
                onChange={(v) => { userSettings.timecodeFormat = v; }}
            />
        </SettingRow>

        <AppOptionsSection />

        <SectionHeader title={t('Prompts and dialogs')} />

        <SettingRow label={t('Show notifications')}>
            <Switch checked={!s.hideOsNotifications} onCheckedChange={(v) => { userSettings.hideOsNotifications = v ? undefined : 'all'; }} />
        </SettingRow>

        <SettingRow label={t('Show informational in-app notifications')}>
            <Switch checked={!s.hideNotifications} onCheckedChange={(v) => { userSettings.hideNotifications = v ? undefined : 'all'; }} />
        </SettingRow>

        <SettingRow label={t('Ask for confirmation when closing app or file?')}>
            <Switch checked={s.askBeforeClose} onCheckedChange={(v) => { userSettings.askBeforeClose = v; }} />
        </SettingRow>

        {showAdvancedSettings && (<>
            <SettingRow label={t('Ask about what to do when opening a new file when another file is already already open?')}>
                <Switch checked={s.enableAskForFileOpenAction} onCheckedChange={(v) => { userSettings.enableAskForFileOpenAction = v; }} />
            </SettingRow>

            <SettingRow label={t('Import chapters to segments when opening file')}>
                <SettingSelect<EnableImportChapters>
                    value={s.enableImportChapters}
                    options={getEnableImportChaptersOptions()}
                    onChange={(v) => { userSettings.enableImportChapters = v; }}
                />
            </SettingRow>

            <SectionHeader title={t('Other')} />

            <SettingRow label={t('Enable HEVC / H265 hardware decoding (you may need to turn this off if you have problems with HEVC files)')}>
                <Switch checked={s.enableNativeHevc} onCheckedChange={(v) => { userSettings.enableNativeHevc = v; }} />
            </SettingRow>

            <SettingRow label={t('Enable FFmpeg `-hwaccel auto` flag. This can improve performance segment auto detection and FFmpeg-assisted playback speed.')}>
                <Switch checked={s.ffmpegHwaccel === 'auto'} onCheckedChange={(v) => { userSettings.ffmpegHwaccel = v ? 'auto' : 'none'; }} />
            </SettingRow>
        </>)}
    </>);
}

function ModifierKeySetting({ text, value, names, onChange }: { text: string; value: ModifierKey; names: Record<ModifierKey, string>; onChange: (v: ModifierKey) => void; }) {
    return (
        <SettingRow label={text}>
            <SettingSelect<ModifierKey> value={value} options={names} onChange={onChange} />
        </SettingRow>
    );
}

function TunerSetting({ text, onClick }: { text: string; onClick: () => void; }) {
    const { t } = useTranslation();
    return (
        <SettingRow label={text}>
            <Button variant="outline" size="sm" onClick={onClick}>
                <CogIcon />
                {t('Change value')}
            </Button>
        </SettingRow>
    );
}

/** Template application options (theme, welcome page, status bar) */
function AppOptionsSection() {
    return (<>
        <SectionHeader title="Application" />
        <div className="py-2 flex flex-col gap-3">
            <AppOptions />
        </div>
    </>);
}
