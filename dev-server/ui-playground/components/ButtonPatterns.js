import {
  IconButton,
  LabeledButton,
  LinkButton,
} from '@hypothesis/frontend-shared';

// TODO: Update after https://github.com/hypothesis/frontend-shared/issues/179
// is resolved
import Library from '@hypothesis/frontend-shared/lib/pattern-library/components/Library';

export default function ButtonPatterns() {
  return (
    <Library.Page title="Buttons">
      <Library.Pattern title="PublishControlButton">
        <p>
          Customizes <code>LabeledButton</code> styling to disable{' '}
          <code>border-radius</code> on the right side. This makes the publish
          button fit with a drop-down menu next to it.
        </p>

        <Library.Example title="Basic usage">
          <Library.Demo withSource>
            <LabeledButton classes="PublishControlButton" variant="primary">
              Publish to My Group
            </LabeledButton>
          </Library.Demo>
        </Library.Example>
      </Library.Pattern>

      <Library.Pattern title="InlineLinkButton">
        <p>
          Customizes <code>LinkButton</code> styling to position inline; dark
          variant always has underline.
        </p>

        <Library.Example title="Basic usage">
          <Library.Demo withSource>
            <LinkButton classes="InlineLinkButton">Log in</LinkButton>
          </Library.Demo>
        </Library.Example>
        <Library.Example title="Dark variant, customized with underline">
          <Library.Demo withSource>
            <LinkButton
              classes="InlineLinkButton InlineLinkButton--underlined"
              variant="dark"
            >
              Log in
            </LinkButton>
          </Library.Demo>
        </Library.Example>
      </Library.Pattern>

      <Library.Pattern title="Non-Responsive IconButton">
        <p>
          An icon-only button overriding responsive affordances to fit in
          specific or tight spaces. These buttons do not have a minimum size
          (for tap-target size) applied for touch-screen/narrow viewports.
        </p>

        <Library.Example variant="wide" title="Sizes (medium is default)">
          <Library.Demo withSource>
            <IconButton
              classes="NonResponsiveIconButton"
              icon="copy"
              title="Edit"
              size="small"
            />
            <IconButton
              classes="NonResponsiveIconButton"
              icon="copy"
              title="Edit"
              size="medium"
            />
            <IconButton
              classes="NonResponsiveIconButton"
              icon="copy"
              title="Edit"
              size="large"
            />
          </Library.Demo>
        </Library.Example>
      </Library.Pattern>

      <Library.Pattern title="PaginationPageButton">
        <p>
          Style customization for <code>LabeledButton</code> that gives it
          asymmetrical padding to fit well as pagination controls in the
          Notebook.
        </p>

        <Library.Example title="Page numbers">
          <Library.Demo withSource style={{ backgroundColor: '#ececec' }}>
            <LabeledButton classes="PaginationPageButton" variant="dark">
              9
            </LabeledButton>
            <LabeledButton
              classes="PaginationPageButton"
              variant="dark"
              pressed
            >
              10
            </LabeledButton>
            <LabeledButton classes="PaginationPageButton" variant="dark">
              11
            </LabeledButton>
          </Library.Demo>
        </Library.Example>

        <Library.Example title="Navigation buttons">
          <Library.Demo withSource style={{ backgroundColor: '#ececec' }}>
            <LabeledButton
              classes="PaginationPageButton"
              icon="arrow-left"
              variant="dark"
            >
              Prev
            </LabeledButton>
            <LabeledButton
              classes="PaginationPageButton"
              icon="arrow-right"
              iconPosition="right"
              variant="dark"
            >
              Next
            </LabeledButton>
          </Library.Demo>
        </Library.Example>
      </Library.Pattern>
    </Library.Page>
  );
}
