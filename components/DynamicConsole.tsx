import React from 'react';
import dynamic from 'next/dynamic';
import type { ConsoleProps } from './Console';

const Console = dynamic<ConsoleProps>(() => import('./Console'), {
  ssr: false,
  loading: () => <div>Loading console...</div>,
});

interface DynamicConsoleProps extends ConsoleProps {}

function DynamicConsole(props: DynamicConsoleProps) {
  return <Console {...props} />;
}

export default DynamicConsole; 