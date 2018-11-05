'use strict';

// @ngInject
function SpinnerController($animate, $element) {
  // ngAnimate conflicts with the spinners own CSS
  $animate.enabled(false, $element);
}

module.exports = {
  controller: SpinnerController,
  controllerAs: 'vm',
  template: `
    <div class="spinner__container">
      <span class="spinner">
        <span><span>
        </span></span>
      </span>
    </div>
  `,
};
