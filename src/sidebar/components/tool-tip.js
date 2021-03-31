import { createElement } from 'preact';
import propTypes from 'prop-types';

export default function Tooltip({
   tooltiptext = 'tooltip',
   children
}) {

    return (
        <div className="tooltip">
            {children}
            <span className="tooltiptext">{tooltiptext}</span>
        </div>
    );
}

Tooltip.propTypes = {
    tooltiptext: propTypes.string,
    children: propTypes.children
};
