const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

type SuggestedFilenameOptions = {
  groupName?: string;
  date?: Date;
};

export const suggestedFilename = ({
  groupName,
  /* istanbul ignore next - test seam */
  date = new Date(),
}: SuggestedFilenameOptions) => {
  const filenameSegments = [formatDate(date), 'Hypothesis'];
  if (groupName) {
    filenameSegments.push(groupName.replace(/ /g, '-'));
  }

  return filenameSegments.join('-');
};
