import {
  IconButton,
  LabeledButton,
  LinkButton,
} from '@hypothesis/frontend-shared';

import {
  PatternPage,
  Pattern,
  PatternExamples,
  PatternExample,
} from '@hypothesis/frontend-shared/lib/pattern-library/components/PatternPage';

export default function ButtonPatterns() {
  return (
    <PatternPage title="Buttons">
      <Pattern title="PublishControlButton">
        <p>
          Customizes <code>LabeledButton</code> styling to disable{' '}
          <code>border-radius</code> on the right side. This makes the publish
          button fit with a drop-down menu next to it.
        </p>

        <PatternExamples>
          <PatternExample details="Basic usage">
            <LabeledButton className="PublishControlButton" variant="primary">
              Publish to My Group
            </LabeledButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="InlineLinkButton">
        <p>
          Customizes <code>LinkButton</code> styling to position inline; dark
          variant always has underline.
        </p>

        <PatternExamples>
          <PatternExample details="Basic usage">
            <LinkButton className="InlineLinkButton">Log in</LinkButton>
          </PatternExample>
          <PatternExample details="Dark variant: Always has underline">
            <LinkButton className="InlineLinkButton" variant="dark">
              Log in
            </LinkButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="Non-Responsive IconButton">
        <p>
          An icon-only button overriding responsive affordances to fit in
          specific or tight spaces. These buttons do not have a minimum size
          (for tap-target size) applied for touch-screen/narrow viewports.
        </p>

        <PatternExamples>
          <PatternExample details="Sizes: medium is default">
            <IconButton
              className="NonResponsiveIconButton"
              icon="edit"
              title="Edit"
              size="small"
            />
            <IconButton
              className="NonResponsiveIconButton"
              icon="edit"
              title="Edit"
              size="medium"
            />
            <IconButton
              className="NonResponsiveIconButton"
              icon="edit"
              title="Edit"
              size="large"
            />
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="PaginationPageButton">
        <p>
          Style customization for <code>LabeledButton</code> that gives it
          asymmetrical padding to fit well as pagination controls in the
          Notebook.
        </p>

        <PatternExamples>
          <PatternExample
            details="Page numbers"
            style={{ backgroundColor: '#ececec' }}
          >
            <LabeledButton className="PaginationPageButton" variant="dark">
              9
            </LabeledButton>
            <LabeledButton
              className="PaginationPageButton"
              variant="dark"
              pressed
            >
              10
            </LabeledButton>
            <LabeledButton className="PaginationPageButton" variant="dark">
              11
            </LabeledButton>
          </PatternExample>
          <PatternExample
            details="Navigation buttons"
            style={{ backgroundColor: '#ececec' }}
          >
            <LabeledButton
              className="PaginationPageButton"
              icon="arrow-left"
              variant="dark"
            >
              Prev
            </LabeledButton>
            <LabeledButton
              className="PaginationPageButton"
              icon="arrow-right"
              iconPosition="right"
              variant="dark"
            >
              Next
            </LabeledButton>
          </PatternExample>
        </PatternExamples>
      </Pattern>

      <Pattern title="InputButton">
        <p>
          Customizes <code>IconButton</code> styling to make the button part of
          a composite pattern with an input field to the left.
        </p>

        <PatternExamples>
          <PatternExample details="Basic usage">
            <IconButton
              className="InputButton"
              title="Copy version details"
              icon="copy"
            />
          </PatternExample>
          <PatternExample details="Small size">
            <IconButton
              className="InputButton"
              title="Copy version details"
              icon="copy"
              size="small"
            />
          </PatternExample>
        </PatternExamples>
      </Pattern>
    </PatternPage>
  );
}
