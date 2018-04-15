'use strict';

/**
 * Return the className according to the given parameters.
 *
 * @param {String} feedback_user - The user of the feedback
 * @param {String} user_id - Id of loggedin user
 * @param {String} type - hover, card or text
 *
 */

function getProperClassName(feedback_user, user_id, type){
  if (feedback_user === user_id){
    return {'hover':'annotator-hl-hover-yours','card':'users__card-selected','text': 'annotator-hl-selected-yours' }[type];
  }
  else{
    return {'hover':'annotator-hl-hover-public','card':'default__card-selected','text': 'annotator-hl-selected-public' }[type];
  }
}

module.exports = getProperClassName;
