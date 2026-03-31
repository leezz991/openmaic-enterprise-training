'use client';

import { db, mediaFileKey } from '@/lib/utils/database';
import type { Scene, Stage } from '@/lib/types/stage';
import type { Action } from '@/lib/types/action';
import { isMediaPlaceholder } from '@/lib/store/media-generation';
import type { PersistedGeneratedAgent } from '@/lib/orchestration/registry/store';

interface PersistClassroomResult {
  id: string;
  url: string;
  scenes: Scene[];
  mediaUploaded: number;
  audioUploaded: number;
  warnings: string[];
}

function getExtensionFromMimeType(mimeType: string, fallback: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('aac')) return 'aac';
  return fallback;
}

async function uploadAsset(
  classroomId: string,
  relativePath: string,
  file: Blob,
  filename: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('classroomId', classroomId);
  formData.append('relativePath', relativePath);
  formData.append('file', file, filename);

  const response = await fetch('/api/classroom/assets', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to upload classroom asset');
  }

  return result.url as string;
}

async function persistMediaAssets(classroomId: string, scenes: Scene[]) {
  const warnings: string[] = [];
  const uploadedMap = new Map<string, string>();

  for (const scene of scenes) {
    if (scene.type !== 'slide') continue;

    const canvas = (
      scene.content as {
        canvas?: { elements?: Array<{ src?: string; type?: string; poster?: string }> };
      }
    )?.canvas;

    if (!canvas?.elements) continue;

    for (const element of canvas.elements) {
      if (
        (element.type !== 'image' && element.type !== 'video') ||
        typeof element.src !== 'string' ||
        !isMediaPlaceholder(element.src)
      ) {
        continue;
      }

      if (!uploadedMap.has(element.src)) {
        const record = await db.mediaFiles.get(mediaFileKey(classroomId, element.src));
        if (!record || record.error || !record.blob) {
          uploadedMap.set(element.src, '');
        } else {
          try {
            const fallbackExt = element.type === 'video' ? 'mp4' : 'png';
            const extension = getExtensionFromMimeType(record.mimeType, fallbackExt);
            const filename = `${element.src}.${extension}`;
            const url = await uploadAsset(
              classroomId,
              `media/${filename}`,
              record.blob,
              filename,
            );
            uploadedMap.set(element.src, url);
          } catch (error) {
            uploadedMap.set(element.src, '');
            warnings.push(
              `媒体 ${element.src} 上传失败：${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      element.src = uploadedMap.get(element.src) || '';
    }
  }

  const uploadedCount = Array.from(uploadedMap.values()).filter(Boolean).length;
  return { uploadedCount, warnings };
}

async function persistAudioAssets(classroomId: string, scenes: Scene[]) {
  let uploadedCount = 0;
  const warnings: string[] = [];

  for (const scene of scenes) {
    if (!scene.actions?.length) continue;

    for (const action of scene.actions as Action[]) {
      if (action.type !== 'speech' || !action.audioId) continue;

      const audioRecord = await db.audioFiles.get(action.audioId);
      if (!audioRecord?.blob) continue;

      try {
        const extension = getExtensionFromMimeType(
          audioRecord.blob.type || audioRecord.format || '',
          audioRecord.format || 'mp3',
        );
        const filename = `${action.audioId}.${extension}`;
        action.audioUrl = await uploadAsset(
          classroomId,
          `audio/${filename}`,
          audioRecord.blob,
          filename,
        );
        uploadedCount += 1;
      } catch (error) {
        warnings.push(
          `音频 ${action.audioId} 上传失败：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return { uploadedCount, warnings };
}

export async function persistClassroomForPublishing(
  stage: Stage,
  scenes: Scene[],
): Promise<PersistClassroomResult> {
  const stagePayload = structuredClone(stage);
  const scenesPayload = structuredClone(scenes);
  const generatedAgents = ((await db.generatedAgents.where('stageId').equals(stage.id).toArray()) ??
    []) as PersistedGeneratedAgent[];

  const mediaResult = await persistMediaAssets(stage.id, scenesPayload);
  const audioResult = await persistAudioAssets(stage.id, scenesPayload);

  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage: stagePayload,
      scenes: scenesPayload,
      generatedAgents,
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to persist classroom');
  }

  return {
    id: result.id as string,
    url: result.url as string,
    scenes: scenesPayload,
    mediaUploaded: mediaResult.uploadedCount,
    audioUploaded: audioResult.uploadedCount,
    warnings: [...mediaResult.warnings, ...audioResult.warnings],
  };
}
