import {
  PatternPage,
  Pattern,
  PatternExamples,
  PatternExample,
} from '../shared/components/PatternPage';

import { IconButton } from '../../../src/shared/components/buttons';

export default function ButtonPatterns() {
  return (
    <PatternPage title="Buttons">
      <Pattern title="Non-Responsive IconButton">
        <p>
          An icon-only button overriding responsive affordances to fit in
          specific or tight spaces.
        </p>

        <PatternExamples>
          <PatternExample details="Sizes: medium is default">
            <IconButton icon="edit" title="Edit" size="small" />
            <IconButton icon="edit" title="Edit" size="medium" />
            <IconButton icon="edit" title="Edit" size="large" />
          </PatternExample>
        </PatternExamples>
      </Pattern>
    </PatternPage>
  );
}
