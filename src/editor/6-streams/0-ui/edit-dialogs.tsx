import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import type { FFprobeStream } from '@shared/ffprobe';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import type { FileParams, StreamParams } from '@/editor/0-core/8-lib/types.ts';
import { allFilesMetaAtom, filePathAtom, paramsByFileAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Switch } from '@/ui/shadcn/switch';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/shadcn/tabs';
import { cn } from '@/utils/classnames';
import { editingFileAtom, editingStreamAtom, editingTagKeyAtom, setEditingFile, setEditingStream } from '../9-state/streams-ui-atoms.ts';
import { updateFileParams, updateStreamParams } from '../7-actions/streams-actions.tsx';
import { useLocalProxy } from '../8-lib/use-local-proxy.ts';
import { TagEditor } from './tag-editor.tsx';

// Port of upstream StreamsSelector.tsx EditFileDialog/EditStreamDialog

const setEditingTagKey = (key: string | undefined) => jotaiDefaultStore.set(editingTagKeyAtom, key);

function KeyValue({ name, value }: { name: ReactNode; value: ReactNode; }) {
    return (
        <div className="mb-1.5 text-sm flex items-center justify-between gap-4">
            <div>{name}</div>
            <div>{value}</div>
        </div>
    );
}

function Hint({ children }: { children: ReactNode; }) {
    return <div className="mb-2 text-xs text-muted-foreground">{children}</div>;
}

function parseNonNegativeInt(value: string) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function AspectEditor({ stream, streamParams, update }: { stream: FFprobeStream; streamParams: StreamParams | undefined; update: (setter: (a: StreamParams) => void) => void; }) {
    const { t } = useTranslation();
    const currentAr = streamParams?.aspectRatio ?? { num: 0, den: 0 };

    const updateAr = (field: 'num' | 'den', value: string) => update((params) => {
        params.aspectRatio = { ...currentAr, [field]: parseNonNegativeInt(value) };
    });

    const isSar = stream.codec_name === 'h264' || stream.codec_name === 'hevc';

    return (
        <>
            <Hint>
                {isSar ? t('Losslessly change the sample aspect ratio (SAR) of this track with a bitstream filter.') : t('Losslessly change the display aspect ratio of this track at the container level.')}
                {' '}
                {t('Note that this is not supported in all video players.')}
            </Hint>
            <KeyValue name={t('Width')} value={<Input className="h-7 w-20" type="number" min="0" placeholder="W" value={currentAr.num > 0 ? String(currentAr.num) : ''} onChange={(e) => updateAr('num', e.target.value)} />} />
            <KeyValue name={t('Height')} value={<Input className="h-7 w-20" type="number" min="0" placeholder="H" value={currentAr.den > 0 ? String(currentAr.den) : ''} onChange={(e) => updateAr('den', e.target.value)} />} />
        </>
    );
}

function CropEditor({ stream, streamParams, update }: { stream: FFprobeStream; streamParams: StreamParams | undefined; update: (setter: (a: StreamParams) => void) => void; }) {
    const { t } = useTranslation();
    const currentCrop = streamParams?.crop ?? { left: 0, right: 0, top: 0, bottom: 0 };

    if (!(stream.codec_name === 'h264' || stream.codec_name === 'hevc')) return null;

    const fields = [['left', t('Left')], ['right', t('Right')], ['top', t('Top')], ['bottom', t('Bottom')]] as const;

    return (
        <>
            <Hint>
                {t('Losslessly crop pixels from each edge.')}
                {' '}
                {t('Note that this is not supported in all video players.')}
            </Hint>
            {fields.map(([field, label]) => (
                <KeyValue
                    key={field}
                    name={label}
                    value={<Input className="h-7 w-20" type="number" min="0" step="2" value={String(currentCrop[field])} onChange={(e) => update((params) => { params.crop = { ...currentCrop, [field]: parseNonNegativeInt(e.target.value) }; })} />}
                />
            ))}
        </>
    );
}

function OffsetEditor({ fileParams, update }: { fileParams: FileParams | undefined; update: (setter: (a: FileParams) => void) => void; }) {
    const { t } = useTranslation();
    const state = useLocalProxy(() => ({ valid: true }));
    const snap = useSnapshot(state);

    function handleChange(value: string) {
        if (value.trim() === '') {
            update((params) => { params.offset = undefined; });
            state.valid = true;
            return;
        }
        const offset = Number(value);
        state.valid = !Number.isNaN(offset);
        if (state.valid) update((params) => { params.offset = offset; });
    }

    return (
        <>
            <Hint>{t('Shift the timestamps of all tracks in this file by a specified number of seconds, relative to other files. Positive values will delay the file\'s tracks, negative will advance it.')}</Hint>
            <KeyValue name={t('Shift by seconds')} value={<Input className={cn('h-7 w-20', !snap.valid && 'border-destructive text-destructive')} placeholder="0.0" defaultValue={fileParams?.offset ?? ''} onChange={(e) => handleChange(e.target.value)} />} />
        </>
    );
}

export function EditFileDialog() {
    const { t } = useTranslation();
    const editingFile = useAtomValue(editingFileAtom);
    const editingKey = useAtomValue(editingTagKeyAtom);

    return (
        <Dialog open={editingFile != null} onOpenChange={(open) => !open && setEditingFile(undefined)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('Edit file metadata')}</DialogTitle>
                    <DialogDescription className="sr-only">{t('Edit file metadata')}</DialogDescription>
                </DialogHeader>

                {editingFile != null && <EditFileContent editingFile={editingFile} editingKey={editingKey} />}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button disabled={editingKey != null}>{t('Done')}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditFileContent({ editingFile, editingKey }: { editingFile: string; editingKey: string | undefined; }) {
    const { t } = useTranslation();
    const allFilesMeta = useAtomValue(allFilesMetaAtom);
    const paramsByFile = useAtomValue(paramsByFileAtom);
    // We only support editing main file metadata for now
    const enableMetadata = editingFile === useAtomValue(filePathAtom);

    const existingMetadata = allFilesMeta[editingFile]?.format?.tags ?? {};
    const fileParams = paramsByFile.get(editingFile);
    const update = (setter: (a: FileParams) => void) => updateFileParams(editingFile, setter);

    const tagInfo = {
        encoder: { description: t('This is hardcoded by FFmpeg and cannot be changed.') },
    };

    return (
        <Tabs defaultValue={enableMetadata ? 'metadata' : 'offset'} className="min-h-80">
            <TabsList>
                {enableMetadata && <TabsTrigger value="metadata">{t('Metadata')}</TabsTrigger>}
                <TabsTrigger value="offset">{t('Offset')}</TabsTrigger>
            </TabsList>

            {enableMetadata && (
                <TabsContent value="metadata">
                    <TagEditor
                        existingTags={existingMetadata}
                        customTags={fileParams?.metadata}
                        editingTag={editingKey}
                        setEditingTag={setEditingTagKey}
                        onTagsChange={(keyValues) => update((params) => { params.metadata = { ...params.metadata, ...keyValues }; })}
                        onTagReset={(key) => update((params) => {
                            const { [key]: _deleted, ...rest } = params.metadata;
                            params.metadata = rest;
                        })}
                        addTagTitle={t('Add metadata')}
                        tagInfo={tagInfo}
                        canDeleteExisting
                    />
                </TabsContent>
            )}

            <TabsContent value="offset">
                <OffsetEditor fileParams={fileParams} update={update} />
            </TabsContent>
        </Tabs>
    );
}

export function EditStreamDialog() {
    const { t } = useTranslation();
    const editingStream = useAtomValue(editingStreamAtom);
    const editingKey = useAtomValue(editingTagKeyAtom);
    const allFilesMeta = useAtomValue(allFilesMetaAtom);

    const stream = editingStream != null ? allFilesMeta[editingStream.path]?.streams.find((s) => s.index === editingStream.streamId) : undefined;

    return (
        <Dialog open={stream != null} onOpenChange={(open) => !open && setEditingStream(undefined)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('Edit track {{trackNum}} metadata', { trackNum: stream && (stream.index + 1) })}</DialogTitle>
                    <DialogDescription className="sr-only">{t('Edit track metadata')}</DialogDescription>
                </DialogHeader>

                {editingStream != null && stream != null && <EditStreamContent path={editingStream.path} stream={stream} editingKey={editingKey} />}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button disabled={editingKey != null}>{t('Done')}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditStreamContent({ path, stream, editingKey }: { path: string; stream: FFprobeStream; editingKey: string | undefined; }) {
    const { t } = useTranslation();
    const paramsByFile = useAtomValue(paramsByFileAtom);
    const streamParams = paramsByFile.get(path)?.paramsByStream.get(stream.index);
    const update = (setter: (a: StreamParams) => void) => updateStreamParams(path, stream.index, setter);

    const tagInfo = {
        language: {
            description: t('The language tag (ISO 639-2 code). For example "eng" for English. This is used by some players to select the appropriate audio/subtitle track based on the user\'s language preferences.'),
            url: 'https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes',
        },
    };

    return (
        <Tabs defaultValue="metadata" className="min-h-80">
            <TabsList>
                <TabsTrigger value="metadata">{t('Metadata')}</TabsTrigger>
                {stream.codec_type === 'video' && (
                    <>
                        <TabsTrigger value="crop">{t('Crop')}</TabsTrigger>
                        <TabsTrigger value="aspectratio">{t('Aspect ratio')}</TabsTrigger>
                    </>
                )}
                <TabsTrigger value="parameters">{t('Parameters')}</TabsTrigger>
            </TabsList>

            <TabsContent value="metadata">
                <TagEditor
                    existingTags={stream.tags ?? {}}
                    customTags={streamParams?.metadata}
                    editingTag={editingKey}
                    setEditingTag={setEditingTagKey}
                    onTagsChange={(keyValues) => update((params) => {
                        params.metadata = { ...params.metadata };
                        for (const [tag, value] of Object.entries(keyValues)) {
                            params.metadata[tag] = tag === 'language' ? value.toLowerCase() : value;
                        }
                    })}
                    onTagReset={(key) => update((params) => {
                        if (params.metadata == null) return;
                        const { [key]: _deleted, ...rest } = params.metadata;
                        params.metadata = rest;
                    })}
                    addTagTitle={t('Add metadata')}
                    tagInfo={tagInfo}
                    canDeleteExisting
                />
            </TabsContent>

            <TabsContent value="crop">
                <CropEditor stream={stream} streamParams={streamParams} update={update} />
            </TabsContent>

            <TabsContent value="aspectratio">
                <AspectEditor stream={stream} streamParams={streamParams} update={update} />
            </TabsContent>

            <TabsContent value="parameters">
                {/* https://github.com/mifi/lossless-cut/issues/1680#issuecomment-1682915193 */}
                {stream.codec_name === 'h264' && (
                    <KeyValue
                        name={t('Enable "{{filterName}}" bitstream filter.', { filterName: 'h264_mp4toannexb' })}
                        value={<Switch checked={!!streamParams?.bsfH264Mp4toannexb} onCheckedChange={(checked) => update((params) => { params.bsfH264Mp4toannexb = checked; })} />}
                    />
                )}

                {stream.codec_name === 'hevc' && (
                    <>
                        <KeyValue
                            name={t('Enable "{{filterName}}" bitstream filter.', { filterName: 'hevc_mp4toannexb' })}
                            value={<Switch checked={!!streamParams?.bsfHevcMp4toannexb} onCheckedChange={(checked) => update((params) => { params.bsfHevcMp4toannexb = checked; })} />}
                        />
                        <KeyValue
                            name={t('Enable "{{filterName}}" bitstream filter.', { filterName: 'hevc_metadata=aud=insert' })}
                            value={<Switch checked={!!streamParams?.bsfHevcAudInsert} onCheckedChange={(checked) => update((params) => { params.bsfHevcAudInsert = checked; })} />}
                        />
                    </>
                )}

                {(stream.codec_type === 'video' || stream.codec_type === 'audio') && (
                    <KeyValue
                        name={t('Codec tag')}
                        value={<Input className="h-7 w-40" placeholder={stream.codec_tag_string ?? t('Default')} value={streamParams?.tag ?? ''} onChange={(e) => update((params) => { params.tag = e.target.value.trim() === '' ? undefined : e.target.value; })} />}
                    />
                )}
            </TabsContent>
        </Tabs>
    );
}
