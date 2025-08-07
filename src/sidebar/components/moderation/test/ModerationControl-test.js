import { mockImportedComponents, mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import { defaultAnnotation } from '../../../test/annotation-fixtures';
import { FetchError } from '../../../util/fetch';
import ModerationControl, { $imports } from '../ModerationControl';

describe('ModerationControl', () => {
  let fakeAnnotationsService;
  let fakeToastMessenger;

  beforeEach(() => {
    fakeAnnotationsService = {
      moderate: sinon.stub().resolves(undefined),
      loadAnnotation: sinon.stub().resolves(defaultAnnotation()),
    };
    fakeToastMessenger = {
      notice: sinon.stub(),
      error: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
  });

  function createComponent({ annotation, groupIsPreModerated = true }) {
    return mount(
      <ModerationControl
        annotation={annotation}
        groupIsPreModerated={groupIsPreModerated}
        annotationsService={fakeAnnotationsService}
        toastMessenger={fakeToastMessenger}
      />,
    );
  }

  it('renders nothing when annotation is APPROVED and group is not pre-moderated', () => {
    const wrapper = createComponent({
      annotation: {
        ...defaultAnnotation(),
        moderation_status: 'APPROVED',
      },
      groupIsPreModerated: false,
    });
    assert.isEmpty(wrapper.text());
  });

  it('renders ModerationStatusSelect when annotation can be moderated', () => {
    const wrapper = createComponent({
      annotation: {
        ...defaultAnnotation(),
        actions: ['moderate'],
      },
    });

    assert.isTrue(wrapper.exists('ModerationStatusSelect'));
    assert.isFalse(wrapper.exists('ModerationStatusBadge'));
  });

  it('renders ModerationStatusSelect for APPROVED annotations in non-pre-moderated groups, if annotation is flagged', () => {
    const wrapper = createComponent({
      annotation: {
        ...defaultAnnotation(),
        actions: ['moderate'],
        moderation_status: 'APPROVED',
        moderation: { flagCount: 10 },
      },
      groupIsPreModerated: false,
    });

    assert.isTrue(wrapper.exists('ModerationStatusSelect'));
    assert.isFalse(wrapper.exists('ModerationStatusBadge'));
  });

  it('renders ModerationStatusBadge when annotation cannot be moderated', () => {
    const wrapper = createComponent({
      annotation: defaultAnnotation(),
    });

    assert.isTrue(wrapper.exists('ModerationStatusBadge'));
    assert.isFalse(wrapper.exists('ModerationStatusSelect'));
  });

  it('calls annotations service when ModerationStatusSelect value is changed', () => {
    const annotation = {
      ...defaultAnnotation(),
      actions: ['moderate'],
    };
    const wrapper = createComponent({ annotation });
    const getSelect = () => wrapper.find('ModerationStatusSelect');

    assert.isFalse(getSelect().prop('disabled'));
    getSelect().props().onChange('APPROVED');
    wrapper.update();

    assert.isTrue(getSelect().prop('disabled'));
    assert.calledWith(fakeAnnotationsService.moderate, annotation, 'APPROVED');
  });

  context('when saving annotations fails', () => {
    it('shows a notice toast message when a conflict error occurs', async () => {
      fakeAnnotationsService.moderate.rejects(
        new FetchError('', new Response('', { status: 409 })),
      );

      const annotation = {
        ...defaultAnnotation(),
        actions: ['moderate'],
      };
      const wrapper = createComponent({ annotation });
      await wrapper.find('ModerationStatusSelect').props().onChange('APPROVED');

      assert.calledWith(fakeAnnotationsService.loadAnnotation, annotation.id);
      assert.calledWith(
        fakeToastMessenger.notice,
        'The annotation has been updated since this page was loaded. Review this new version and try again.',
        { autoDismiss: false },
      );
      assert.notCalled(fakeToastMessenger.error);
    });

    it('shows an error toast message when a conflict error occurs but the annotation could not be loaded', async () => {
      fakeAnnotationsService.moderate.rejects(
        new FetchError('', new Response('', { status: 409 })),
      );
      fakeAnnotationsService.loadAnnotation.rejects(new Error(''));

      const annotation = {
        ...defaultAnnotation(),
        actions: ['moderate'],
      };
      const wrapper = createComponent({ annotation });
      await wrapper.find('ModerationStatusSelect').props().onChange('APPROVED');

      assert.calledWith(fakeAnnotationsService.loadAnnotation, annotation.id);
      assert.calledWith(
        fakeToastMessenger.error,
        'The annotation has been updated since this page was loaded',
      );
      assert.notCalled(fakeToastMessenger.notice);
    });

    it('shows an error toast message when an unknown error occurs', async () => {
      fakeAnnotationsService.moderate.rejects(new Error(''));

      const wrapper = createComponent({
        annotation: {
          ...defaultAnnotation(),
          actions: ['moderate'],
        },
      });
      await wrapper.find('ModerationStatusSelect').props().onChange('APPROVED');

      assert.notCalled(fakeAnnotationsService.loadAnnotation);
      assert.calledWith(
        fakeToastMessenger.error,
        'An error occurred updating the moderation status',
      );
      assert.notCalled(fakeToastMessenger.notice);
    });
  });
});
