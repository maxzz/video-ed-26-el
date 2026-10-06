// Owner: 8-concat port. Public API of the concat/batch feature.
// Batch state and the batch keyboard actions (closeBatch, batchOpenSelectedFile, ...) are owned by 2-file.
export { BatchFilesList } from './0-ui/3-batch-files-list.tsx';
export { ConcatHosts } from './0-ui/0-concat-hosts.tsx';

export { concatBatch, userConcatFiles } from './7-actions/concat-actions.ts';
