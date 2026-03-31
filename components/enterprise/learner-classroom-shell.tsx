'use client';

import { useEffect, useState } from 'react';
import { Stage } from '@/components/stage';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';
import { useStageStore } from '@/lib/store/stage';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { useSettingsStore } from '@/lib/store/settings';
import {
  hydrateGeneratedAgentsForStage,
  loadGeneratedAgentsForStage,
  useAgentRegistry,
} from '@/lib/orchestration/registry/store';
import type { PersistedClassroomData } from '@/lib/server/classroom-storage';
import type { CourseMetadata } from '@/lib/server/course-catalog';

interface LearnerClassroomShellProps {
  course: CourseMetadata;
  classroom: PersistedClassroomData;
}

const DEFAULT_AGENT_IDS = ['default-1', 'default-2', 'default-3'];

export function LearnerClassroomShell({ course, classroom }: LearnerClassroomShellProps) {
  const [ready, setReady] = useState(false);
  const setStage = useStageStore((state) => state.setStage);
  const setScenes = useStageStore((state) => state.setScenes);
  const setCurrentSceneId = useStageStore((state) => state.setCurrentSceneId);
  const clearStore = useStageStore((state) => state.clearStore);
  const setMode = useStageStore((state) => state.setMode);

  useEffect(() => {
    let disposed = false;

    const hydrateLearnerStage = async () => {
      useMediaGenerationStore.getState().revokeObjectUrls();
      useMediaGenerationStore.setState({ tasks: {} });

      clearStore();
      setStage(classroom.stage);
      setScenes(classroom.scenes);
      setMode('playback');
      setCurrentSceneId(classroom.scenes[0]?.id ?? null);

      let selectedAgentIds: string[] = [];

      if (Array.isArray(classroom.generatedAgents) && classroom.generatedAgents.length > 0) {
        selectedAgentIds = hydrateGeneratedAgentsForStage(classroom.id, classroom.generatedAgents);
        useSettingsStore.getState().setAgentMode('auto');
      } else {
        try {
          const generatedAgentIds = await loadGeneratedAgentsForStage(classroom.id);
          if (generatedAgentIds.length > 0) {
            selectedAgentIds = generatedAgentIds;
            useSettingsStore.getState().setAgentMode('auto');
          }
        } catch {
          selectedAgentIds = [];
        }
      }

      if (selectedAgentIds.length === 0) {
        const registry = useAgentRegistry.getState();
        const stageAgentIds = classroom.stage.agentIds?.filter((id) => registry.getAgent(id));
        selectedAgentIds =
          stageAgentIds && stageAgentIds.length > 0 ? stageAgentIds : DEFAULT_AGENT_IDS;
        useSettingsStore.getState().setAgentMode('preset');
      }

      useSettingsStore.getState().setSelectedAgentIds(selectedAgentIds);

      if (!disposed) {
        setReady(true);
      }
    };

    setReady(false);
    void hydrateLearnerStage();

    return () => {
      disposed = true;
      clearStore();
    };
  }, [classroom, clearStore, setCurrentSceneId, setMode, setScenes, setStage]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        正在加载课程...
      </div>
    );
  }

  return (
    <MediaStageProvider value={classroom.id}>
      <div className="h-screen flex flex-col overflow-hidden" data-course-title={course.title}>
        <Stage
          shellMode="learner"
          backHref="/courses"
          brandHref="/courses"
          brandLabel="简而言之AI交互学习平台"
          brandImageSrc=""
          brandAlt="简而言之AI交互学习平台"
        />
      </div>
    </MediaStageProvider>
  );
}
