import { Callout } from '@hypothesis/frontend-shared';

export default function OutsideAssignmentNotice() {
  return (
    <Callout
      classes="fixed left-[10px] top-[10px]"
      data-testid="outside-assignment-notice"
      status="notice"
      variant="raised"
    >
      You are outside the page range for this assignment. Annotations made here
      may not be counted.
    </Callout>
  );
}
