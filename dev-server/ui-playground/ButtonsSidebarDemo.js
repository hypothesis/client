import {
  PatternPage,
  Pattern,
  PatternExamples,
  PatternExample,
} from './Patterns';

import { IconButton, LabeledButton } from '../../src/shared/components/Buttons';

export default function ButtonsSidebarDemo() {
  return (
    <PatternPage title="Buttons: Sidebar">
      <Pattern title="IconButton: CompactIconButton">
        <p>
          In several places in the Sidebar, there isn&rsquo;t enough room to
          display an icon button with its full padding and touch-target
          affordances. In other words, we need an icon button for tight spaces.
        </p>
        <p>
          In the long run, it would be ideal to be able to provide the full
          mobile touch-target size.
        </p>
        <PatternExamples>
          <PatternExample details="Sizes">
            <IconButton
              className="CompactIconButton"
              icon="edit"
              size="large"
              title="Edit"
            />
            <IconButton
              className="CompactIconButton"
              icon="edit"
              title="Edit"
            />
            <IconButton
              className="CompactIconButton"
              icon="edit"
              size="small"
              title="Edit"
            />
          </PatternExample>

          <PatternExample details="Pressed">
            <IconButton
              className="CompactIconButton"
              icon="trash"
              title="Delete annotation"
              size="large"
              pressed
            />
            <IconButton
              className="CompactIconButton"
              icon="trash"
              title="Delete annotation"
              pressed
            />
            <IconButton
              className="CompactIconButton"
              icon="trash"
              title="Delete annotation"
              size="small"
              pressed
            />
          </PatternExample>

          <PatternExample details="Expanded">
            <IconButton
              className="CompactIconButton"
              icon="trash"
              size="large"
              title="Delete annotation"
              expanded
            />
            <IconButton
              className="CompactIconButton"
              icon="trash"
              title="Delete annotation"
              expanded
            />
            <IconButton
              className="CompactIconButton"
              icon="trash"
              size="small"
              title="Delete annotation"
              expanded
            />
          </PatternExample>

          <PatternExample details="Disabled">
            <IconButton
              className="CompactIconButton"
              icon="trash"
              size="large"
              title="Delete annotation"
              disabled
            />
            <IconButton
              className="CompactIconButton"
              icon="trash"
              title="Delete annotation"
              disabled
            />
            <IconButton
              className="CompactIconButton"
              icon="trash"
              size="small"
              title="Delete annotation"
              disabled
            />
          </PatternExample>

          <PatternExample details="Primary variant">
            <IconButton
              className="CompactIconButton"
              icon="profile"
              size="large"
              title="User info"
              variant="primary"
            />
            <IconButton
              className="CompactIconButton"
              icon="profile"
              title="User info"
              variant="primary"
            />
            <IconButton
              className="CompactIconButton"
              icon="profile"
              size="small"
              title="User info"
              variant="primary"
            />
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="IconButton: IconInputButton">
        <p>
          This component is used to the right of a text input and the two make
          up a compound component.
        </p>
        <PatternExamples>
          <PatternExample details="Sizes">
            <IconButton
              className="IconInputButton"
              icon="copy"
              size="large"
              title="Copy"
            />
            <IconButton className="IconInputButton" icon="copy" title="Copy" />
            <IconButton
              className="IconInputButton"
              icon="copy"
              size="small"
              title="Copy"
            />
          </PatternExample>

          <PatternExample details="Pressed">
            <IconButton
              className="IconInputButton"
              icon="trash"
              size="large"
              title="Delete annotation"
              pressed
            />
            <IconButton
              className="IconInputButton"
              icon="trash"
              title="Delete annotation"
              pressed
            />
            <IconButton
              className="IconInputButton"
              icon="trash"
              size="small"
              title="Delete annotation"
              pressed
            />
          </PatternExample>

          <PatternExample details="Expanded">
            <IconButton
              className="IconInputButton"
              icon="trash"
              size="large"
              title="Delete annotation"
              expanded
            />
            <IconButton
              className="IconInputButton"
              icon="trash"
              title="Delete annotation"
              expanded
            />
            <IconButton
              className="IconInputButton"
              icon="trash"
              size="small"
              title="Delete annotation"
              expanded
            />
          </PatternExample>

          <PatternExample details="Disabled">
            <IconButton
              className="IconInputButton"
              icon="trash"
              size="large"
              title="Delete annotation"
              disabled
            />
            <IconButton
              className="IconInputButton"
              icon="trash"
              title="Delete annotation"
              disabled
            />
            <IconButton
              className="IconInputButton"
              icon="trash"
              size="small"
              title="Delete annotation"
              disabled
            />
          </PatternExample>

          <PatternExample details="Primary variant">
            <IconButton
              className="IconInputButton"
              icon="profile"
              size="large"
              title="User info"
              variant="primary"
            />
            <IconButton
              className="IconInputButton"
              icon="profile"
              title="User info"
              variant="primary"
            />
            <IconButton
              className="IconInputButton"
              icon="profile"
              size="small"
              title="User info"
              variant="primary"
            />
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LabeledButton: CompactLabeledButton">
        <p>A labeled button with tighter padding.</p>
        <PatternExamples>
          <PatternExample details="Sizes">
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              size="large"
            >
              Edit User
            </LabeledButton>
            <LabeledButton className="CompactLabeledButton" icon="profile">
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              size="small"
            >
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              pressed
              size="large"
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              pressed
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              pressed
              size="small"
            >
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              expanded
              size="large"
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              expanded
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              expanded
              size="small"
            >
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              disabled
              size="large"
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              disabled
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              disabled
              size="small"
            >
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Primary variant">
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              size="large"
              variant="primary"
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              variant="primary"
            >
              Edit User
            </LabeledButton>
            <LabeledButton
              className="CompactLabeledButton"
              icon="profile"
              size="small"
              variant="primary"
            >
              Edit User
            </LabeledButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LabeledButton: Custom on Grey">
        <p>
          Example of customizing a button to display well on a darker
          background.
        </p>
        <PatternExamples>
          <PatternExample details="Sizes">
            <LabeledButton size="large" className="TestCustomButton">
              100
            </LabeledButton>
            <LabeledButton className="TestCustomButton">100</LabeledButton>
            <LabeledButton size="small" className="TestCustomButton">
              100
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton size="large" className="TestCustomButton" pressed>
              100
            </LabeledButton>
            <LabeledButton className="TestCustomButton" pressed>
              100
            </LabeledButton>
            <LabeledButton size="small" className="TestCustomButton" pressed>
              100
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton size="large" className="TestCustomButton" expanded>
              100
            </LabeledButton>
            <LabeledButton className="TestCustomButton" expanded>
              100
            </LabeledButton>
            <LabeledButton size="small" className="TestCustomButton" expanded>
              100
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton size="large" className="TestCustomButton" disabled>
              100
            </LabeledButton>
            <LabeledButton className="TestCustomButton" disabled>
              100
            </LabeledButton>
            <LabeledButton size="small" className="TestCustomButton" disabled>
              100
            </LabeledButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>
    </PatternPage>
  );
}
