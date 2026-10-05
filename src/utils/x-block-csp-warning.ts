/**
 * For electron app. Block the message "Download the React DevTools" in console.
 * add import './x-devtool-install-block'; before import 'react' in main.tsx.
 */
(function () {
    const orginalInfo = console.info;
    console.warn = function (...rest: any[]) {
        if (!/Electron Security Warning/.test(rest[0])) {
            orginalInfo.apply(console, rest);
        }
    };
})();
