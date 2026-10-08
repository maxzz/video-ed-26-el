import { type ComponentType, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { MotionConfig } from "motion/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { useTranslation } from "react-i18next";

import { settingsVisibleAtom, showAdvancedSettingsAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { prefersReducedMotionAtom } from "@/editor/0-core/9-state/user-settings";
import { appSettings } from "@/store/1-ui-settings";
import { Section_General } from "./4-sections/1-section-general";
import { Section_ExportOptions } from "./4-sections/2-section-export";
import { Section_Snapshots } from "./4-sections/3-section-snapshots";
import { Section_Input } from "./4-sections/4-section-input";
import { Section_UserInterface } from "./4-sections/5-section-ui";
import { Section_Application } from "./4-sections/6-section-app";
import { Section_Prompts } from "./4-sections/7-section-prompts";
import { Section_Other } from "./4-sections/8-section-other";

// Port of upstream components/Settings.tsx

type SettingsSectionId = 'general' | 'export' | 'snapshots' | 'input' | 'ui' | 'app' | 'prompts' | 'other';

const settingsSections: { id: SettingsSectionId; titleKey: string; Panel: ComponentType; advancedOnly?: boolean; }[] = [
    { id: 'general', titleKey: 'General', Panel: Section_General },
    { id: 'export', titleKey: 'Options affecting exported files', Panel: Section_ExportOptions },
    { id: 'snapshots', titleKey: 'Snapshots and frame extraction', Panel: Section_Snapshots },
    { id: 'input', titleKey: 'Keyboard, mouse and input', Panel: Section_Input },
    { id: 'ui', titleKey: 'User interface', Panel: Section_UserInterface },
    { id: 'app', titleKey: 'Application', Panel: Section_Application },
    { id: 'prompts', titleKey: 'Prompts and dialogs', Panel: Section_Prompts },
    { id: 'other', titleKey: 'Other', Panel: Section_Other, advancedOnly: true },
];

function sectionIdAt(sections: readonly { id: SettingsSectionId; }[], index: number): SettingsSectionId {
    return sections[index]?.id ?? sections[0]?.id ?? 'general';
}

export function Dialog_Settings() {
    const [open, setOpen] = useAtom(settingsVisibleAtom);
    const reducedMotion = useAtomValue(prefersReducedMotionAtom);
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 w-[min(56rem,calc(100vw-2rem))] h-[min(85vh,56rem)] text-xs overflow-hidden flex flex-col gap-0">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">
                        {t('Settings')}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {t('Hover mouse over buttons in the main interface to see which function they have')}
                    </DialogDescription>
                </DialogHeader>

                <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
                    <div className="min-h-0 overflow-hidden flex flex-1">
                        {open && <Body />}
                    </div>
                </MotionConfig>
            </DialogContent>
        </Dialog>
    );
}

function Body() {
    const { t } = useTranslation();
    const showAdvancedSettings = useAtomValue(showAdvancedSettingsAtom);
    const sections = settingsSections.filter((item) => showAdvancedSettings || !item.advancedOnly);
    const [section, setSection] = useState(() => sectionIdAt(sections, appSettings.settingsTabIndex));

    const active = sections.some((item) => item.id === section) ? section : sections[0].id;
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        panelRef.current?.scrollTo(0, 0);
    }, [active]);

    const activeSection = sections.find((item) => item.id === active) ?? sections[0];
    const Panel = activeSection?.Panel;

    function selectSection(id: SettingsSectionId) {
        setSection(id);
        const index = sections.findIndex((item) => item.id === id);
        if (index >= 0) {
            appSettings.settingsTabIndex = index;
        }
    }

    return (
        <div className="min-w-0 min-h-0 flex flex-1 gap-0">
            <TabSelect<SettingsSectionId>
                aria-label={t('Settings')}
                className="shrink-0 min-h-0 w-60 bg-muted/30 border-r overflow-y-auto"
                items={sections.map((item) => ({ value: item.id, label: t(item.titleKey) }))}
                orientation="vertical"
                value={active}
                onValueChange={selectSection}
            />

            <div ref={panelRef} className="min-w-0 min-h-0 overflow-y-auto flex-1">
                {Panel && (
                    <div className="px-4 py-2 text-xs">
                        <Panel />
                    </div>
                )}
            </div>
        </div>
    );
}
