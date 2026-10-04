import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';

export function SectionHeader({ title }: { title: ReactNode; }) {
    return (
        <h3 className="sticky top-0 pt-4 pb-1.5 text-sm font-semibold bg-background border-b z-10">
            {title}
        </h3>
    );
}

/** One setting: description on the left, control on the right (upstream Settings table row) */
export function SettingRow({ label, details, children }: { label: ReactNode; details?: ReactNode; children: ReactNode; }) {
    return (
        <motion.div
            className="py-2 border-b border-border/60 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="min-w-0 flex-1">
                <div>{label}</div>
                {details && <div className="mt-1 text-[0.7rem] text-muted-foreground">{details}</div>}
            </div>
            <div className="shrink-0 max-w-[50%] flex flex-wrap items-center justify-end gap-1.5">
                {children}
            </div>
        </motion.div>
    );
}

export function SettingSelect<T extends string>({ value, options, onChange, disabled, className }: {
    value: T;
    options: Record<T, ReactNode> | [T, ReactNode][];
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
}) {
    const entries = (Array.isArray(options) ? options : Object.entries(options)) as [T, ReactNode][];
    return (
        <Select value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
            <SelectTrigger className={className ?? 'max-w-60 min-w-36 text-xs'} size="sm">
                <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
                {entries.map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
