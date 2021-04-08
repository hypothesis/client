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
} from '../../../../../src/shared/components/buttons';

export default function SharedButtonPatterns() {
  return (
    <PatternPage title="Buttons (Shared)">
      <Pattern title="IconButton">
        <p>A button containing an icon and no other content.</p>

        <h3>Sizes</h3>
        <p>
          The optional <code>size</code> property affects the proportions and
          overall size of the button by way of padding. It does not change the
          size of the icon itself, which is sized at&nbsp;
          <code>1em</code>. The default sizing is <code>medium</code>.
        </p>
        <PatternExamples>
          <PatternExample details="Sizes: medium is default">
            <IconButton icon="edit" title="Edit" size="small" />
            <IconButton icon="edit" title="Edit" size="medium" />
            <IconButton icon="edit" title="Edit" size="large" />
          </PatternExample>
        </PatternExamples>

        <h3>Default variant</h3>
        <PatternExamples>
          <PatternExample details="Default state">
            <IconButton icon="trash" title="Delete annotation" />
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
        </PatternExamples>

        <h3>Primary variant</h3>
        <PatternExamples>
          <PatternExample details="Basic usage">
            <IconButton icon="edit" title="Edit" variant="primary" />
          </PatternExample>

          <PatternExample details="Pressed">
            <IconButton
              icon="trash"
              title="Delete annotation"
              pressed
              variant="primary"
            />
          </PatternExample>

          <PatternExample details="Expanded">
            <IconButton
              icon="trash"
              title="Delete annotation"
              expanded
              variant="primary"
            />
          </PatternExample>

          <PatternExample details="Disabled">
            <IconButton
              icon="trash"
              title="Delete annotation"
              disabled
              variant="primary"
            />
          </PatternExample>
        </PatternExamples>

        <h3>Light variant</h3>
        <p>
          This variant should only be used for non-critical icons on white
          backgrounds (low contrast).
        </p>
        <PatternExamples>
          <PatternExample
            details="Basic usage"
            style={{ backgroundColor: 'white' }}
          >
            <IconButton icon="collapsed" title="Edit" variant="light" />
          </PatternExample>

          <PatternExample
            details="Pressed"
            style={{ backgroundColor: 'white' }}
          >
            <IconButton
              icon="collapsed"
              title="Delete annotation"
              pressed
              variant="light"
            />
          </PatternExample>

          <PatternExample
            details="Expanded"
            style={{ backgroundColor: 'white' }}
          >
            <IconButton
              icon="collapsed"
              title="Delete annotation"
              expanded
              variant="light"
            />
          </PatternExample>

          <PatternExample
            details="Disabled"
            style={{ backgroundColor: 'white' }}
          >
            <IconButton
              icon="collapsed"
              title="Delete annotation"
              disabled
              variant="light"
            />
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LabeledButton">
        <p>A button with content and, optionally, an icon.</p>

        <h3>Sizes</h3>
        <p>
          As with <code>IconButton</code>, sizing affects proportions and
          overall size via padding.
        </p>

        <PatternExamples>
          <PatternExample details="Label only">
            <LabeledButton size="small">Edit</LabeledButton>
            <LabeledButton>Edit</LabeledButton>
            <LabeledButton size="large">Edit</LabeledButton>
          </PatternExample>

          <PatternExample details="Label and icon">
            <LabeledButton icon="profile" size="small">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile">Edit User</LabeledButton>
            <LabeledButton icon="profile" size="large">
              Edit User
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Label and icon: icon on right">
            <LabeledButton icon="profile" size="small" iconPosition="right">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" iconPosition="right">
              Edit User
            </LabeledButton>
            <LabeledButton icon="profile" size="large" iconPosition="right">
              Edit User
            </LabeledButton>
          </PatternExample>
        </PatternExamples>

        <h3>Default variant</h3>

        <PatternExamples>
          <PatternExample details="Default state">
            <LabeledButton>Edit</LabeledButton>
            <LabeledButton icon="edit">Edit</LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton pressed>Edit</LabeledButton>
            <LabeledButton icon="edit" pressed>
              Edit
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton expanded>Edit</LabeledButton>
            <LabeledButton icon="edit" expanded>
              Edit
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton disabled>Edit</LabeledButton>
            <LabeledButton icon="edit" disabled>
              Edit
            </LabeledButton>
          </PatternExample>
        </PatternExamples>

        <h3>Primary variant</h3>

        <PatternExamples>
          <PatternExample details="Default state">
            <LabeledButton variant="primary">Edit user</LabeledButton>
            <LabeledButton icon="profile" variant="primary">
              Edit user
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LabeledButton pressed variant="primary">
              Edit user
            </LabeledButton>
            <LabeledButton icon="profile" pressed variant="primary">
              Edit user
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LabeledButton expanded variant="primary">
              Edit user
            </LabeledButton>
            <LabeledButton icon="profile" expanded variant="primary">
              Edit user
            </LabeledButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LabeledButton disabled variant="primary">
              Edit user
            </LabeledButton>
            <LabeledButton icon="profile" disabled variant="primary">
              Edit user
            </LabeledButton>
          </PatternExample>
        </PatternExamples>

        <h3>Dark variant</h3>

        <p>Intended for use on non-white, very light grey backgrounds.</p>
        <PatternExamples>
          <PatternExample
            details="Default state"
            style={{ backgroundColor: '#ececec' }}
          >
            <LabeledButton variant="dark">Buy ice cream</LabeledButton>
            <LabeledButton icon="trash" variant="dark">
              Buy ice cream
            </LabeledButton>
          </PatternExample>

          <PatternExample
            details="Pressed"
            style={{ backgroundColor: '#ececec' }}
          >
            <LabeledButton pressed variant="dark">
              Buy ice cream
            </LabeledButton>
            <LabeledButton icon="trash" pressed variant="dark">
              Buy ice cream
            </LabeledButton>
          </PatternExample>

          <PatternExample
            details="Expanded"
            style={{ backgroundColor: '#ececec' }}
          >
            <LabeledButton expanded variant="dark">
              Buy ice cream
            </LabeledButton>
            <LabeledButton expanded icon="edit" variant="dark">
              Buy ice cream
            </LabeledButton>
          </PatternExample>

          <PatternExample
            details="Disabled"
            style={{ backgroundColor: '#ececec' }}
          >
            <LabeledButton disabled variant="dark">
              Buy ice cream
            </LabeledButton>
            <LabeledButton disabled icon="edit" variant="dark">
              Buy ice cream
            </LabeledButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="LinkButton">
        <p>A button styled to look like a link (anchor tag).</p>

        <h3>Default variant</h3>
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
        </PatternExamples>

        <h3>Primary variant</h3>

        <PatternExamples>
          <PatternExample details="Basic usage">
            <LinkButton variant="primary">Show replies (10)</LinkButton>
          </PatternExample>

          <PatternExample details="Pressed">
            <LinkButton pressed variant="primary">
              Show replies (10)
            </LinkButton>
          </PatternExample>

          <PatternExample details="Expanded">
            <LinkButton expanded variant="primary">
              Show replies (10)
            </LinkButton>
          </PatternExample>

          <PatternExample details="Disabled">
            <LinkButton disabled variant="primary">
              Show replies (10)
            </LinkButton>
          </PatternExample>
        </PatternExamples>

        <h3>Dark variant</h3>
        <p>For use on light grey (non-white) backgrounds.</p>

        <PatternExamples>
          <PatternExample
            details="Basic usage"
            style={{ backgroundColor: '#ececec' }}
          >
            <LinkButton variant="dark">Show replies (10)</LinkButton>
          </PatternExample>

          <PatternExample
            details="Pressed"
            style={{ backgroundColor: '#ececec' }}
          >
            <LinkButton pressed variant="dark">
              Show replies (10)
            </LinkButton>
          </PatternExample>

          <PatternExample
            details="Expanded"
            style={{ backgroundColor: '#ececec' }}
          >
            <LinkButton expanded variant="dark">
              Show replies (10)
            </LinkButton>
          </PatternExample>

          <PatternExample
            details="Disabled"
            style={{ backgroundColor: '#ececec' }}
          >
            <LinkButton disabled variant="dark">
              Show replies (10)
            </LinkButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>
    </PatternPage>
  );
}
