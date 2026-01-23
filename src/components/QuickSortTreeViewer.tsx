import * as React from 'react';

import { FullscreenTreeViewer, type FullscreenTreeViewerApi } from '@/components/FullscreenTreeViewer';

export type QuickSortTreeViewerApi = FullscreenTreeViewerApi;

type Props = React.ComponentProps<typeof FullscreenTreeViewer>;

// Thin wrapper to keep naming consistent with Merge/Quick deliverables.
export const QuickSortTreeViewer: React.FC<Props> = (props) => {
  return <FullscreenTreeViewer {...props} />;
};
