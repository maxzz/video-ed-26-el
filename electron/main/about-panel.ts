import { app, type AboutPanelOptionsOptions } from 'electron';
import { appName, copyrightYear, githubUrl, homepageUrl } from '@shared/constants.ts';
import { isLinux } from './util.ts';
import { t } from './i18n.ts';

export function getAboutPanelOptions(): AboutPanelOptionsOptions {
    const lines = [
        homepageUrl,
        '',
        `Based on LosslessCut ${githubUrl}`,
        `${t('Copyright')} © 2016-${copyrightYear} Mikael Finstad and contributors`,
        'Licensed under GPL-2.0',
    ];

    return {
        applicationName: appName,
        copyright: lines.join('\n'),
        version: '',
        // https://github.com/electron/electron/issues/18918
        ...(isLinux && { applicationVersion: app.getVersion() }),
    };
}
