import {
  PatternPage,
  Pattern,
  PatternExamples,
  PatternExample,
} from '../PatternPage';

import {
  IconButton,
  LabeledButton,
  LinkButton,
} from '../../../../src/shared/components/buttons';

export default function SharedButtonPatterns() {
  return (
    <PatternPage title="Buttons (Shared)">
      <Pattern title="IconButton">
        <p>A button containing an icon and no label (text)</p>
        <PatternExamples>
          <PatternExample details="Basic usage">
            <IconButton icon="edit" title="Edit" />
          </PatternExample>

          <PatternExample details="Pressed">
            <IconButton icon="trash" title="Delete annotation" pressed />
          </PatternExample>

          <PatternExample details="Expanded">
            <IconButton icon="trash" title="Delete annotation" expanded />
          </PatternExample>

          <PatternExample details="Disabled">
            <IconButton icon="trash" title="Delete annotation" disabled />
          </PatternExample>

          <PatternExample details="Primary variant">
            <IconButton
              icon="trash"
              title="Delete annotation"
              variant="primary"
            />
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LabeledButton">
        <p>A button with a label (text) and optionally an icon.</p>
        <PatternExamples title="Label only">
          <PatternExample details="Basic usage">
            <LabeledButton>Edit</LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton pressed>Edit</LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton expanded>Edit</LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton disabled>Edit</LabeledButton>
          </PatternExample>

          <PatternExample details="Primary variant">
            <LabeledButton variant="primary">Edit</LabeledButton>
          </PatternExample>
        </PatternExamples>

        <PatternExamples title="Label and icon">
          <PatternExample details="Basic usage">
            <LabeledButton icon="profile">Edit User</LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton icon="profile" pressed>
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton icon="profile" expanded>
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton icon="profile" disabled>
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Right icon">
            <LabeledButton icon="profile" iconPosition="right">
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Primary variant">
            <LabeledButton icon="profile" variant="primary">
              Edit User
            </LabeledButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LinkButton">
        <p>A button styled to look like a link (anchor tag).</p>
        <PatternExamples>
          <PatternExample details="Basic usage">
            <LinkButton>Show replies (10)</LinkButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LinkButton pressed>Show replies (10)</LinkButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LinkButton expanded>Show replies (10)</LinkButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LinkButton disabled>Show replies (10)</LinkButton>
          </PatternExample>

          <PatternExample details="Primary variant">
            <LinkButton variant="primary">Show replies (10)</LinkButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>
    </PatternPage>
  );
}
