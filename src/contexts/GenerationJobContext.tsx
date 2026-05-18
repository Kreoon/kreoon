import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';

const CONTENT_AI_FUNCTION = 'content-ai';
const JOB_TTL_MS = 10 * 60 * 1000; // 10 minutos

export interface SkillsProgress {
  phase: number;
  totalPhases: number;
  currentSkillNames: string[];
  pct: number;
}

export interface GeneratedContent {
  script: string;
  director_output?: string;
  marketing_output?: string;
  captions?: string;
  broll_output?: string;
}

export interface GenerationJob {
  contentId: string;
  projectTitle?: string;
  status: 'running' | 'completed' | 'error';
  progress: SkillsProgress | null;
  result: GeneratedContent | null;
  error: string | null;
  startedAt: Date;
}

interface GenerationJobContextType {
  jobs: Map<string, GenerationJob>;
  startScriptGeneration: (params: {
    contentId: string;
    projectTitle?: string;
    body: object;
    onProgress: (progress: SkillsProgress) => void;
    onResult: (result: string) => void;
    onError: (err: string) => void;
    saveFn: (result: GeneratedContent) => Promise<void>;
  }) => void;
  getJob: (contentId: string) => GenerationJob | undefined;
  clearJob: (contentId: string) => void;
}

const GenerationJobContext = createContext<GenerationJobContextType | null>(null);

export function GenerationJobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Map<string, GenerationJob>>(new Map());
  // Keep a mutable ref in sync so async callbacks always see the latest map
  const jobsRef = useRef<Map<string, GenerationJob>>(new Map());

  const updateJob = useCallback((contentId: string, patch: Partial<GenerationJob>) => {
    const current = jobsRef.current.get(contentId);
    if (!current) return;
    const updated = { ...current, ...patch };
    jobsRef.current.set(contentId, updated);
    setJobs(new Map(jobsRef.current));
  }, []);

  const startScriptGeneration = useCallback(async ({
    contentId,
    projectTitle,
    body,
    onProgress,
    onResult,
    onError,
    saveFn,
  }: {
    contentId: string;
    projectTitle?: string;
    body: object;
    onProgress: (p: SkillsProgress) => void;
    onResult: (script: string) => void;
    onError: (err: string) => void;
    saveFn: (result: GeneratedContent) => Promise<void>;
  }) => {
    const job: GenerationJob = {
      contentId,
      projectTitle,
      status: 'running',
      progress: null,
      result: null,
      error: null,
      startedAt: new Date(),
    };
    jobsRef.current.set(contentId, job);
    setJobs(new Map(jobsRef.current));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/${CONTENT_AI_FUNCTION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalScript = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));

              if (currentEvent === 'phase_start') {
                const progress: SkillsProgress = {
                  phase: payload.phase,
                  totalPhases: payload.total,
                  currentSkillNames: payload.skills ?? [],
                  pct: payload.pct ?? 0,
                };
                updateJob(contentId, { progress });
                onProgress(progress);
              } else if (currentEvent === 'phase_complete') {
                const currentJob = jobsRef.current.get(contentId);
                if (currentJob?.progress) {
                  const progress = { ...currentJob.progress, pct: payload.pct ?? currentJob.progress.pct };
                  updateJob(contentId, { progress });
                  onProgress(progress);
                }
              } else if (currentEvent === 'complete') {
                finalScript = payload.script ?? payload.result ?? '';
                if (payload.error) throw new Error(payload.error);
              } else if (currentEvent === 'error') {
                throw new Error(payload.message ?? 'Error en la generación');
              }

              currentEvent = '';
            } catch {
              // línea malformada — ignorar
            }
          }
        }
      }

      // Notify the in-modal listener (if modal is still open)
      onResult(finalScript);

      // Save to Supabase regardless of modal state
      const generatedContent: GeneratedContent = { script: finalScript };
      await saveFn(generatedContent);

      updateJob(contentId, { status: 'completed', result: generatedContent });

      // Auto-clean completed jobs after TTL
      setTimeout(() => {
        jobsRef.current.delete(contentId);
        setJobs(new Map(jobsRef.current));
      }, JOB_TTL_MS);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(contentId, { status: 'error', error: message });
      onError(message);
    }
  }, [updateJob]);

  const getJob = useCallback((contentId: string) => jobsRef.current.get(contentId), []);

  const clearJob = useCallback((contentId: string) => {
    jobsRef.current.delete(contentId);
    setJobs(new Map(jobsRef.current));
  }, []);

  return (
    <GenerationJobContext.Provider value={{ jobs, startScriptGeneration, getJob, clearJob }}>
      {children}
    </GenerationJobContext.Provider>
  );
}

export function useGenerationJob() {
  const ctx = useContext(GenerationJobContext);
  if (!ctx) throw new Error('useGenerationJob must be used within GenerationJobProvider');
  return ctx;
}
