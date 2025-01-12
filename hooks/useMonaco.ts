import { useEffect, useState, useRef } from 'react';

interface MonacoState {
  isLoading: boolean;
  error: Error | null;
  monaco: any;
}

declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

export const useMonaco = () => {
  const [state, setState] = useState<MonacoState>({
    isLoading: true,
    error: null,
    monaco: null
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initMonaco = async () => {
      if (!mountedRef.current) return;
      
      try {
        if (window.monaco) {
          setState({ isLoading: false, error: null, monaco: window.monaco });
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Monaco initialization timeout'));
          }, 10000);

          window.require(['vs/editor/editor.main'], () => {
            clearTimeout(timeout);
            if (!mountedRef.current) return;
            setState({ isLoading: false, error: null, monaco: window.monaco });
            resolve();
          });
        });
      } catch (error) {
        if (mountedRef.current) {
          setState({ isLoading: false, error: error as Error, monaco: null });
        }
      }
    };

    initMonaco();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return state;
};