import {
  PatternPage,
  Pattern,
  PatternExamples,
  PatternExample,
} from './Patterns';

import {
  CustomButton,
  IconButton,
  LabeledButton,
  LinkButton,
} from '../../src/shared/components/Buttons';

export default function ButtonsSharedDemo() {
  return (
    <PatternPage title="Buttons (Shared)">
      <Pattern title="IconButton">
        <p>A button containing an icon and no label (text)</p>
        <PatternExamples>
          <PatternExample details="Sizes">
            <IconButton icon="edit" size="large" title="Edit" />
            <IconButton icon="edit" title="Edit" />
            <IconButton icon="edit" size="small" title="Edit" />
          </PatternExample>

          <PatternExample details="Pressed">
            <IconButton
              icon="trash"
              size="large"
              title="Delete annotation"
              pressed
            />
            <IconButton icon="trash" title="Delete annotation" pressed />
            <IconButton
              icon="trash"
              size="small"
              title="Delete annotation"
              pressed
            />
          </PatternExample>

          <PatternExample details="Expanded">
            <IconButton
              icon="trash"
              size="large"
              title="Delete annotation"
              expanded
            />
            <IconButton icon="trash" title="Delete annotation" expanded />
            <IconButton
              icon="trash"
              size="small"
              title="Delete annotation"
              expanded
            />
          </PatternExample>

          <PatternExample details="Disabled">
            <IconButton
              icon="trash"
              size="large"
              title="Delete annotation"
              disabled
            />
            <IconButton icon="trash" title="Delete annotation" disabled />
            <IconButton
              icon="trash"
              size="small"
              title="Delete annotation"
              disabled
            />
          </PatternExample>

          <PatternExample details="Primary variant">
            <IconButton
              icon="trash"
              size="large"
              title="Delete annotation"
              variant="primary"
            />
            <IconButton
              icon="trash"
              title="Delete annotation"
              variant="primary"
            />
            <IconButton
              icon="trash"
              size="small"
              title="Delete annotation"
              variant="primary"
            />
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LabeledButton">
        <p>A button with a label (text) and optionally an icon.</p>
        <PatternExamples title="Label only">
          <PatternExample details="Sizes">
            <LabeledButton size="large">Edit</LabeledButton>
            <LabeledButton>Edit</LabeledButton>
            <LabeledButton size="small">Edit</LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton size="large" pressed>
              Edit
            </LabeledButton>
            <LabeledButton pressed>Edit</LabeledButton>
            <LabeledButton size="small" pressed>
              Edit
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton size="large" expanded>
              Edit
            </LabeledButton>
            <LabeledButton expanded>Edit</LabeledButton>
            <LabeledButton size="small" expanded>
              Edit
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton size="large" disabled>
              Edit
            </LabeledButton>
            <LabeledButton disabled>Edit</LabeledButton>
            <LabeledButton size="small" disabled>
              Edit
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Primary variant">
            <LabeledButton size="large" variant="primary">
              Edit
            </LabeledButton>
            <LabeledButton variant="primary">Edit</LabeledButton>
            <LabeledButton size="small" variant="primary">
              Edit
            </LabeledButton>
          </PatternExample>
        </PatternExamples>

        <PatternExamples title="Label and icon">
          <PatternExample details="Sizes">
            <LabeledButton icon="profile" size="large">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile">Edit User</LabeledButton>
            <LabeledButton icon="profile" size="small">
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton icon="profile" size="large" pressed>
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" pressed>
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" pressed size="small">
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton icon="profile" size="large" expanded>
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" expanded>
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" expanded size="small">
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton icon="profile" size="large" disabled>
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" disabled>
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" disabled size="small">
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Right icon">
            <LabeledButton icon="profile" size="large" iconPosition="right">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" iconPosition="right">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" size="small" iconPosition="right">
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Primary variant">
            <LabeledButton icon="profile" size="large" variant="primary">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" variant="primary">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" size="small" variant="primary">
              Edit User
            </LabeledButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LinkButton">
        <p>A button styled to look like a link (anchor tag).</p>
        <PatternExamples>
          <PatternExample details="Sizes">
            <LinkButton size="large">Show replies (10)</LinkButton>
            <LinkButton>Show replies (10)</LinkButton>
            <LinkButton size="small">Show replies (10)</LinkButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LinkButton size="large" pressed>
              Show replies (10)
            </LinkButton>
            <LinkButton pressed>Show replies (10)</LinkButton>
            <LinkButton size="small" pressed>
              Show replies (10)
            </LinkButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LinkButton size="large" expanded>
              Show replies (10)
            </LinkButton>
            <LinkButton expanded>Show replies (10)</LinkButton>
            <LinkButton size="small" expanded>
              Show replies (10)
            </LinkButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LinkButton size="large" disabled>
              Show replies (10)
            </LinkButton>
            <LinkButton disabled>Show replies (10)</LinkButton>
            <LinkButton size="small" disabled>
              Show replies (10)
            </LinkButton>
          </PatternExample>

          <PatternExample details="Primary variant">
            <LinkButton size="large" variant="primary">
              Show replies (10)
            </LinkButton>
            <LinkButton variant="primary">Show replies (10)</LinkButton>
            <LinkButton size="small" variant="primary">
              Show replies (10)
            </LinkButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="CustomButton">
        <p>
          Customized by passing a class name. This example could also have been
          accomplished by using `LabeledButton` with a `className`.
        </p>
        <PatternExamples>
          <PatternExample>
            <CustomButton className="TestCustomButton" size="large">
              100
            </CustomButton>
          </PatternExample>

          <PatternExample>
            <CustomButton className="TestCustomButton">100</CustomButton>
          </PatternExample>

          <PatternExample>
            <CustomButton className="TestCustomButton" size="small">
              100
            </CustomButton>
          </PatternExample>

          <PatternExample>
            <CustomButton className="TestCustomButton" pressed>
              Show replies (10)
            </CustomButton>
          </PatternExample>

          <PatternExample>
            <CustomButton className="TestCustomButton" expanded>
              Show replies (10)
            </CustomButton>
          </PatternExample>

          <PatternExample>
            <CustomButton className="TestCustomButton" disabled>
              Show replies (10)
            </CustomButton>
          </PatternExample>

          <PatternExample>
            <CustomButton className="TestCustomButton" variant="primary">
              Show replies(10)
            </CustomButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>
    </PatternPage>
  );
}
