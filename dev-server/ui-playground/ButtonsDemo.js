import ComponentSection from './ComponentSection';
import jsxToString from './jsxToString';

import {
  IconButton,
  CompactIconButton,
  CustomButton,
  IconInputButton,
  LabeledButton,
  LabeledIconButton,
  LinkButton,
  CompactLabeledIconButton,
} from '../../src/sidebar/components/Buttons';

function ComponentTableRow({ children }) {
  return (
    <tr>
      <td>{children}</td>
      <td>
        <code>{jsxToString(children)}</code>
      </td>
    </tr>
  );
}

export default function ButtonDemo() {
  return (
    <ComponentSection title="Buttons">
      <h3>IconButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <IconButton icon="edit" size="large" title="Edit" />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconButton icon="edit" title="Edit" />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconButton icon="edit" size="small" title="Edit" />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconButton icon="trash" title="Delete annotation" isPressed />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconButton icon="trash" title="Delete annotation" isExpanded />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconButton icon="trash" title="Delete annotation" isDisabled />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconButton icon="profile" title="User info" variant="primary" />
        </ComponentTableRow>
      </table>

      <h3>CompactIconButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <CompactIconButton icon="edit" size="large" title="Edit" />
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactIconButton icon="edit" title="Edit" />
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactIconButton icon="edit" size="small" title="Edit" />
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactIconButton icon="trash" title="Delete annotation" isPressed />
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactIconButton
            icon="trash"
            title="Delete annotation"
            isExpanded
          />
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactIconButton
            icon="trash"
            title="Delete annotation"
            isDisabled
          />
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactIconButton
            icon="profile"
            title="User info"
            variant="primary"
          />
        </ComponentTableRow>
      </table>

      <h3>LabeledButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <LabeledButton size="large">Edit</LabeledButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledButton>Edit</LabeledButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledButton size="small">Edit</LabeledButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledButton isPressed>Edit</LabeledButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledButton isExpanded>Edit</LabeledButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledButton isDisabled>Edit</LabeledButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledButton variant="primary">Edit</LabeledButton>
        </ComponentTableRow>
      </table>

      <h3>LabeledIconButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <LabeledIconButton icon="profile" size="large">
            Edit User
          </LabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledIconButton icon="profile">Edit User</LabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledIconButton icon="profile" size="small">
            Edit User
          </LabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledIconButton icon="profile" isPressed>
            Edit User
          </LabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledIconButton icon="profile" isExpanded>
            Edit User
          </LabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledIconButton icon="profile" isDisabled>
            Edit User
          </LabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledIconButton icon="profile" variant="primary">
            Edit User
          </LabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LabeledIconButton icon="profile" iconPosition="right">
            Edit User
          </LabeledIconButton>
        </ComponentTableRow>
      </table>

      <h3>CompactLabeledIconButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile" size="large">
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile">
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile" size="small">
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile" isPressed>
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile" isExpanded>
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile" isDisabled>
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile" variant="primary">
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CompactLabeledIconButton icon="profile" iconPosition="right">
            Edit User
          </CompactLabeledIconButton>
        </ComponentTableRow>
      </table>

      <h3>LinkButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <LinkButton size="large">Show replies (10)</LinkButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LinkButton>Show replies (10)</LinkButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LinkButton size="small">Show replies (10)</LinkButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LinkButton isPressed>Show replies (10)</LinkButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LinkButton isExpanded>Show replies (10)</LinkButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LinkButton isDisabled>Show replies (10)</LinkButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <LinkButton variant="primary">Show replies (10)</LinkButton>
        </ComponentTableRow>
      </table>

      <h3>IconInputButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <IconInputButton icon="copy" size="large" title="Copy" />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconInputButton icon="copy" title="Copy" />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconInputButton icon="copy" size="small" title="Copy" />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconInputButton icon="trash" title="Delete annotation" isPressed />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconInputButton icon="trash" title="Delete annotation" isExpanded />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconInputButton icon="trash" title="Delete annotation" isDisabled />
        </ComponentTableRow>

        <ComponentTableRow>
          <IconInputButton icon="profile" title="User info" variant="primary" />
        </ComponentTableRow>
      </table>

      <h3>CustomButton</h3>
      <table className="ComponentTable">
        <tr>
          <th>Example</th>
          <th>Source</th>
        </tr>

        <ComponentTableRow>
          <CustomButton className="TestCustomButton" size="large">
            100
          </CustomButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CustomButton className="TestCustomButton">100</CustomButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CustomButton className="TestCustomButton" size="small">
            100
          </CustomButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CustomButton className="TestCustomButton" isPressed>
            Show replies (10)
          </CustomButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CustomButton className="TestCustomButton" isExpanded>
            Show replies (10)
          </CustomButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CustomButton className="TestCustomButton" isDisabled>
            Show replies (10)
          </CustomButton>
        </ComponentTableRow>

        <ComponentTableRow>
          <CustomButton className="TestCustomButton" variant="primary">
            Show replies(10)
          </CustomButton>
        </ComponentTableRow>
      </table>
    </ComponentSection>
  );
}
