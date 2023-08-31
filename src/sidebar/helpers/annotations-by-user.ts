import type { APIAnnotationData } from '../../types/api';
import { isReply } from './annotation-metadata';

/**
 * Details of a user and their annotations that are available to import or export.
 */
export type UserAnnotations = {
  userid: string;
  displayName: string;
  annotations: APIAnnotationData[];
};

export type AnnotationsByUserOptions = {
  annotations: APIAnnotationData[];
  getDisplayName: (ann: APIAnnotationData) => string;

  /** If true, replies will be excluded from returned annotations */
  excludeReplies?: boolean;
};

/**
 * Generate an alphabetized list of authors and their importable/exportable
 * annotations.
 */
export function annotationsByUser({
  annotations,
  getDisplayName,
  excludeReplies = false,
}: AnnotationsByUserOptions): UserAnnotations[] {
  const userInfo = new Map<string, UserAnnotations>();
  for (const ann of annotations) {
    if (excludeReplies && isReply(ann)) {
      continue;
    }
    let info = userInfo.get(ann.user);
    if (!info) {
      info = {
        userid: ann.user,
        displayName: getDisplayName(ann),
        annotations: [],
      };
      userInfo.set(ann.user, info);
    }
    info.annotations.push(ann);
  }
  const userInfos = [...userInfo.values()];
  userInfos.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return userInfos;
}
