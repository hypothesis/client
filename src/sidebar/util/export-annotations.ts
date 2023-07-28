import type { Group } from '../../types/api';

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

type SuggestedFilenameOptions = {
  group: Group | null;
  /** Test seam */
  date?: Date;
};

export const suggestedFilename = ({
  group,
  date = new Date(),
}: SuggestedFilenameOptions) => {
  const filenameSegments = [formatDate(date), 'Hypothesis'];
  if (group) {
    filenameSegments.push(group.name.replace(/ /g, '-'));
  }

  return filenameSegments.join('-');
};
