// Owner: 8-concat port. Public API of the concat/batch feature.
// Batch state and the batch keyboard actions (closeBatch, batchOpenSelectedFile, ...) are owned by 2-file.
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { concatBatch } from './7-actions/concat-actions.ts';
import './7-actions/concat-effects.ts';

export { BatchFilesList } from './0-ui/batch-files-list.tsx';
export { ConcatHosts } from './0-ui/concat-hosts.tsx';

export { concatBatch, userConcatFiles } from './7-actions/concat-actions.ts';

registerActions({
    concatBatch,
});
