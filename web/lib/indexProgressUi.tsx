import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

export type IndexProgressJob = {
  repoId: string;
  fullName: string;
  onReady?: () => void;
  onFailed?: (message: string) => void;
};

type IndexProgressUiContextValue = {
  job: IndexProgressJob | null;
  startIndexProgress: (job: IndexProgressJob) => void;
  clearIndexProgress: () => void;
};

const IndexProgressUiContext = createContext<IndexProgressUiContextValue | null>(null);

export function IndexProgressProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<IndexProgressJob | null>(null);

  const startIndexProgress = useCallback((next: IndexProgressJob) => {
    setJob(next);
  }, []);

  const clearIndexProgress = useCallback(() => {
    setJob(null);
  }, []);

  const value = useMemo(
    () => ({ job, startIndexProgress, clearIndexProgress }),
    [job, startIndexProgress, clearIndexProgress]
  );

  return (
    <IndexProgressUiContext.Provider value={value}>{children}</IndexProgressUiContext.Provider>
  );
}

export function useIndexProgressUi(): IndexProgressUiContextValue {
  const ctx = useContext(IndexProgressUiContext);
  if (!ctx) {
    throw new Error('useIndexProgressUi must be used within IndexProgressProvider');
  }
  return ctx;
}
