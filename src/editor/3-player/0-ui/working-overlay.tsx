import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Loader2Icon } from "lucide-react";
import { abortWorking, progressAtom, workingAtom } from "@/editor/0-core/9-state/working";
import { Button } from "@/ui/shadcn/button";
import { Progress } from "@/ui/shadcn/progress";
import { workingElapsedMsAtom } from "../7-actions/working-timer";

/** Port of upstream Working.tsx: blocking overlay while an operation runs, with progress and abort */
export function WorkingOverlay() {
    const working = useAtomValue(workingAtom);
    return (
        <AnimatePresence>
            {working && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <motion.div
                        className="p-4 min-w-60 max-w-sm text-sm text-foreground bg-background/95 border rounded-lg shadow-lg flex flex-col items-center gap-2"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <Loader2Icon className="size-8 text-primary animate-spin" />
                        <div className="text-center">{working.text}...</div>
                        <ElapsedAndProgress />
                        <Button variant="outline" size="sm" onClick={abortWorking}><AbortLabel /></Button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function AbortLabel() {
    const { t } = useTranslation();
    return <>{t('Abort')}</>;
}

function ElapsedAndProgress() {
    const { t } = useTranslation();
    const elapsedMs = useAtomValue(workingElapsedMsAtom);
    const progress = useAtomValue(progressAtom);
    return (<>
        <div className="text-xs text-muted-foreground text-center">
            {t('Elapsed: {{seconds}} seconds', { seconds: (elapsedMs / 1000).toFixed(1) })}
        </div>

        {progress != null && (
            <div className="w-full flex flex-col items-center gap-1">
                <Progress value={progress * 100} className="w-full" />
                <div className="text-base font-mono">{`${(progress * 100).toFixed(1)} %`}</div>
            </div>
        )}
    </>);
}
