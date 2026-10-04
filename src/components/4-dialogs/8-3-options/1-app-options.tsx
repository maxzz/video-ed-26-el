import { type ReactNode, useId } from "react";
import { useSnapshot } from "valtio";
import { appSettings, WelcomeTransition } from "@/store/1-ui-settings";
import { type ThemeMode } from "@/utils/theme-apply";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";

/** Template application options (theme, welcome page, status bar). Shown in the Options dialog and in the editor Settings */
export function AppOptions() {
    const { theme, showWelcome, welcomeTransition, showStatusBar } = useSnapshot(appSettings);

    return (<>
        <OptionRow label="Theme">
            {(id) => (
                <OptionSelect id={id} value={theme} items={THEME_ITEMS} onValueChange={(value) => { appSettings.theme = value; }} />
            )}
        </OptionRow>

        <OptionRow label="Show the Welcome page at startup">
            {(id) => (
                <Switch id={id} checked={showWelcome} onCheckedChange={(checked) => { appSettings.showWelcome = checked; }} />
            )}
        </OptionRow>

        <OptionRow label="Welcome page transition">
            {(id) => (
                <OptionSelect id={id} value={welcomeTransition} items={TRANSITION_ITEMS} onValueChange={(value) => { appSettings.welcomeTransition = value; }} />
            )}
        </OptionRow>

        <OptionRow label="Show status bar">
            {(id) => (
                <Switch id={id} checked={showStatusBar} onCheckedChange={(checked) => { appSettings.showStatusBar = checked; }} />
            )}
        </OptionRow>
    </>);
}

function OptionRow({ label, children }: { label: ReactNode; children: (id: string) => ReactNode; }) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id} className="text-xs font-normal">
                {label}
            </Label>
            {children(id)}
        </div>
    );
}

function OptionSelect<T extends string>({ id, value, items, onValueChange }: {
    id: string;
    value: T;
    items: readonly (readonly [label: string, value: T])[];
    onValueChange: (value: T) => void;
}) {
    return (
        <Select value={value} onValueChange={(v) => onValueChange(v as T)}>
            <SelectTrigger id={id} className="min-w-36" size="sm">
                <SelectValue />
            </SelectTrigger>

            <SelectContent position="popper" align="end">
                {items.map(
                    ([label, itemValue]) => (
                        <SelectItem value={itemValue} key={itemValue}>
                            {label}
                        </SelectItem>
                    )
                )}
            </SelectContent>
        </Select>
    );
}

const THEME_ITEMS: readonly (readonly [label: string, value: ThemeMode])[] = [
    ["Light", "light"],
    ["Dark", "dark"],
    ["System", "system"],
];

const TRANSITION_ITEMS: readonly (readonly [label: string, value: WelcomeTransition])[] = [
    ["Split into quarters", WelcomeTransition.quadrants],
    ["Sliding doors", WelcomeTransition.doors],
];
