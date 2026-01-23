import * as React from 'react';

import { FullscreenTreeViewer, type FullscreenTreeViewerApi } from '@/components/FullscreenTreeViewer';

export type BubbleSortTreeViewerApi = FullscreenTreeViewerApi;

type Props = React.ComponentProps<typeof FullscreenTreeViewer>;

// Thin wrapper to keep naming consistent with Merge/Quick/Bubble deliverables.
export const BubbleSortTreeViewer: React.FC<Props> = (props) => {
  return <FullscreenTreeViewer {...props} />;
};
