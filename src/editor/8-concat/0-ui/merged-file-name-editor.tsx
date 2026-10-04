import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { TriangleAlertIcon, UndoIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { defaultMergedFileTemplate, extVariable } from '@/editor/7-export/8-lib/output-name-template.ts';
import { concatGeneratedFileNamesAtom, concatMergedFileTemplateAtom } from '../9-state/concat-atoms.ts';
import { setConcatMergedFileTemplate } from '../7-actions/concat-actions.ts';

// Merge-files mode of upstream components/FileNameTemplateEditor.tsx

const formatVariable = (variable: string) => `\${${variable}}`;
const extVariableFormatted = formatVariable(extVariable);
const availableVariables = ['FILENAME', extVariable, 'EPOCH_MS', 'SEG_LABEL', 'EXPORT_COUNT'];

export function MergedFileNameEditor() {
    const { t } = useTranslation();
    const template = useAtomValue(concatMergedFileTemplateAtom);
    const generated = useAtomValue(concatGeneratedFileNamesAtom);

    return (
        <div className="text-sm flex flex-col gap-1.5">
            <div>
                {t('Merged output file name:')}{' '}
                <span className="select-text font-mono text-primary break-all">{generated?.fileNames[0]}</span>
            </div>

            <div className="text-xs text-muted-foreground">{t('Output file name template')}:</div>
            <div className="flex items-center gap-1">
                <Input className="text-xs font-mono" value={template} onChange={(e) => setConcatMergedFileTemplate(e.target.value)} />
                <Button variant="outline" size="sm" onClick={() => setConcatMergedFileTemplate(defaultMergedFileTemplate)}>
                    <UndoIcon className="text-destructive" /> {t('Reset')}
                </Button>
            </div>

            <div className="text-xs flex flex-wrap items-center gap-1">
                {`${t('Variables')}:`}
                {availableVariables.map((variable) => (
                    <button key={variable} type="button" className="px-1 font-mono bg-muted hover:bg-muted/70 rounded cursor-pointer" onClick={() => setConcatMergedFileTemplate(`${template}${formatVariable(variable)}`)}>
                        {variable}
                    </button>
                ))}
            </div>

            {generated?.problems.error != null && (
                <Warning className="text-destructive">{generated.problems.error}</Warning>
            )}
            {generated?.problems.error == null && generated?.problems.sameAsInputFileNameWarning && (
                <Warning>{t('Output file name is the same as the source file name. This increases the risk of accidentally overwriting or deleting source files!')}</Warning>
            )}
            {!template.endsWith(extVariableFormatted) && (
                <Warning>{t('The file name template is missing {{ext}} and will result in a file without the suggested extension. This may result in an unplayable output file.', { ext: extVariableFormatted })}</Warning>
            )}
        </div>
    );
}

function Warning({ className = 'text-amber-600 dark:text-amber-400', children }: { className?: string; children: string; }) {
    return (
        <div className={`text-xs ${className} flex items-start gap-1`}>
            <TriangleAlertIcon className="shrink-0 mt-0.5 size-3" />
            {children}
        </div>
    );
}
