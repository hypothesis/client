import angular from 'angular';
import { Component, createElement } from 'preact';
import { useContext } from 'preact/hooks';
import propTypes from 'prop-types';

import { Injector } from '../../../shared/injector';
import { createDirective } from '../../components/test/angular-util';
import { ServiceContext } from '../service-context';
import wrapReactComponent from '../wrap-react-component';

// Saved `onDblClick` prop from last render of `Button`.
// This makes it easy to call it with different arguments.
let lastOnDblClickCallback;

// Saved service context from last render of `Button`.
// Components in the tree can use this to get at Angular services.
let lastServiceContext;

function Button({ label, isDisabled, onClick, onDblClick }) {
  // We don't actually use the `onDblClick` handler in this component.
  // It exists just to test callbacks that take arguments.
  lastOnDblClickCallback = onDblClick;

  lastServiceContext = useContext(ServiceContext);

  return (
    <button disabled={isDisabled} onClick={onClick}>
      {label}
    </button>
  );
}
Button.propTypes = {
  // Simple input properties passed by parent component.
  label: propTypes.string.isRequired,
  isDisabled: propTypes.bool,

  // A required callback with no arguments.
  onClick: propTypes.func.isRequired,

  // An optional callback with a `{ click }` argument.
  onDblClick: propTypes.func,
};

describe('wrapReactComponent', () => {
  function renderButton() {
    const onClick = sinon.stub();
    const onDblClick = sinon.stub();

    const element = createDirective(document, 'btn', {
      label: 'Edit',
      isDisabled: false,
      onClick,
      onDblClick: {
        args: ['count'],
        callback: onDblClick,
      },
    });

    return { element, onClick, onDblClick };
  }

  let servicesInjector;

  beforeEach(() => {
    const servicesInjector = new Injector();
    servicesInjector.register('theme', { value: 'dark' });

    angular
      .module('app', [])
      .component('btn', wrapReactComponent(Button, servicesInjector));
    angular.mock.module('app');
  });

  afterEach(() => {
    if (console.error.restore) {
      console.error.restore();
    }
  });

  it('derives Angular component "bindings" from React "propTypes"', () => {
    const ngComponent = wrapReactComponent(Button, servicesInjector);
    assert.deepEqual(ngComponent.bindings, {
      label: '<',
      isDisabled: '<',
      onClick: '&',
      onDblClick: '&',

      // nb. Props passed via dependency injection should not appear here.
    });
  });

  it('renders the React component when the Angular component is created', () => {
    const { element, onClick } = renderButton();

    const btnEl = element[0].querySelector('button');
    assert.ok(btnEl);

    // Check that properties are passed correctly.
    assert.equal(btnEl.textContent, 'Edit');
    assert.equal(btnEl.disabled, false);

    // Verify that events result in callbacks being invoked.
    btnEl.click();
    assert.called(onClick);
  });

  it('exposes Angular services to the React component and descendants', () => {
    lastServiceContext = null;
    renderButton();
    assert.ok(lastServiceContext);
    assert.equal(lastServiceContext.get('theme'), 'dark');
  });

  it('updates the React component when the Angular component is updated', () => {
    const { element } = renderButton();
    const btnEl = element[0].querySelector('button');
    assert.equal(btnEl.textContent, 'Edit');

    // Change the inputs and re-render.
    element.scope.label = 'Saving...';
    element.scope.$digest();

    // Check that the text _of the original DOM element_, was updated.
    assert.equal(btnEl.textContent, 'Saving...');
  });

  it('removes the React component when the Angular component is destroyed', () => {
    // Create parent Angular component which renders a React child.
    const parentComponent = {
      controllerAs: 'vm',
      bindings: {
        showChild: '<',
      },
      template: '<child ng-if="vm.showChild"></child>',
    };

    // Create a React child which needs to do some cleanup when destroyed.
    const childUnmounted = sinon.stub();
    class ChildComponent extends Component {
      componentWillUnmount() {
        childUnmounted();
      }
    }
    ChildComponent.propTypes = {};

    angular
      .module('app', [])
      .component('parent', parentComponent)
      .component('child', wrapReactComponent(ChildComponent, servicesInjector));
    angular.mock.module('app');

    // Render the component with the child initially visible.
    const element = createDirective(document, 'parent', { showChild: true });

    // Re-render with the child removed and check that the React component got
    // destroyed properly.
    element.scope.showChild = false;
    element.scope.$digest();

    assert.called(childUnmounted);
  });

  it('throws an error if the developer forgets to set propTypes', () => {
    function TestComponent() {
      return <div>Hello world</div>;
    }
    assert.throws(
      () => wrapReactComponent(TestComponent, servicesInjector),
      'React component TestComponent does not specify its inputs using "propTypes"'
    );
  });

  // Input property checking is handled by React when debug checks are enabled.
  // This test just makes sure that these checks are working as expected.
  it('throws an error if property types do not match when component is rendered', () => {
    const { element } = renderButton();
    const btnEl = element[0].querySelector('button');
    assert.equal(btnEl.textContent, 'Edit');

    // Incorrectly set label to a number, instead of a string.
    element.scope.label = 123;
    const consoleError = sinon.stub(console, 'error');
    element.scope.$digest();

    assert.calledWithMatch(
      consoleError,
      /Invalid Button `label` of type `number`/
    );
  });

  it('throws an error if a callback is passed a non-object argument', () => {
    renderButton();
    assert.throws(() => {
      lastOnDblClickCallback('not an object');
    }, 'onDblClick callback must be invoked with an object. Was passed "not an object"');
  });

  it('supports invoking callback properties', () => {
    const { onDblClick } = renderButton();
    lastOnDblClickCallback({ count: 1 });

    // The React component calls `onDblClick({ count: 1 })`. The template which
    // renders the Angular wrapper contains an expression which references
    // those variables (`<btn on-dbl-click="doSomething(count)">`) and the end
    // result is that the callback gets passed the value of `count`.
    assert.calledWith(onDblClick, 1);
  });

  it('supports invoking callback properties if a digest cycle is already in progress', () => {
    const { element, onDblClick } = renderButton();
    element.scope.$apply(() => {
      lastOnDblClickCallback({ count: 1 });
    });
    assert.calledWith(onDblClick, 1);
  });

  it('triggers a digest cycle when invoking callback properties', () => {
    // Create an Angular component which passes an `on-{event}` callback down
    // to a child React component.
    const parentComponent = {
      controller() {
        this.clicked = false;
      },
      controllerAs: 'vm',
      template: `
        <child on-click="vm.clicked = true"></child>
        <div class="click-indicator" ng-if="vm.clicked">Clicked</div>
      `,
    };

    function Child({ onClick }) {
      return <button onClick={onClick}>Click me</button>;
    }
    Child.propTypes = { onClick: propTypes.func };

    angular
      .module('app', [])
      .component('parent', parentComponent)
      .component('child', wrapReactComponent(Child, servicesInjector));
    angular.mock.module('app');

    const element = createDirective(document, 'parent');
    assert.isNull(element[0].querySelector('.click-indicator'));

    const btn = element.find('button')[0];
    btn.click();

    // Check that parent component DOM has been updated to reflect new state of
    // `vm.clicked`. This requires the `btn.click()` call to trigger a digest
    // cycle.
    assert.ok(element[0].querySelector('.click-indicator'));
  });
});
