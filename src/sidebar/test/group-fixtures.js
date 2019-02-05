'use strict';

const Chance = require('chance');
const chance = new Chance();

function group() {
  const id = chance.hash({ length: 15 });
  const name = chance.string();
  const group = {
    id: id,
    name: name,
    links: {
      html: `http://localhost:5000/groups/${id}/${name}`,
    },
    type: 'private',
  };
  return group;
}

function organization(options = {}) {
  const org = {
    id: chance.hash({ length: 15 }),
    name: chance.string(),
    logo: chance.url(),
  };
  return Object.assign(org, options);
}

function defaultOrganization() {
  return {
    id: '__default__',
    name: 'Hypothesis',
    logo: 'http://example.com/hylogo',
  };
}

function expandedGroup(options = {}) {
  const expanded = group();
  expanded.organization = organization();

  return Object.assign(expanded, options);
}

module.exports = {
  group,
  expandedGroup,
  organization,
  defaultOrganization,
};
