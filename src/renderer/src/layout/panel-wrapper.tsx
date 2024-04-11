import { ResizableHandle, ResizablePanel } from '@/components/ui/resizable';
import React from 'react';

export function PanelWrapper({ children }: { children: React.ReactNode }) {
  const size = 80 / React.Children.count(children);

  // Temp removing collapsable navigation
  return React.Children.map(children, (child, i) => {
    const isOdd = i % 2 !== 0;

    return (
      <>
        <ResizableHandle withHandle={isOdd} />
        <ResizablePanel defaultSize={size} minSize={isOdd ? 30 : size}>
          {child}
        </ResizablePanel>
      </>
    );
  });
}
