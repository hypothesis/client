import {
  PatternPage,
  Pattern,
  PatternExamples,
  PatternExample,
} from '../PatternPage';

import Menu from '../../../../src/sidebar/components/Menu';
import MenuItem from '../../../../src/sidebar/components/MenuItem';

export default function MenuPatterns() {
  return (
    <PatternPage title="Menu">
      <Pattern title="Menu">
        <p>A simple Menu usage example</p>
        <PatternExamples>
          <PatternExample details="Menu">
            <Menu label="Edit">
              <MenuItem label="Zoom in" />
              <MenuItem label="Zoom out" />
              <MenuItem label="Undo" />
              <MenuItem label="Redo" />
            </Menu>
          </PatternExample>
        </PatternExamples>
      </Pattern>
    </PatternPage>
  );
}
