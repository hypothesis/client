'use strict';

const Chance = require('chance');
const chance = new Chance();

function group () {
  const id = chance.hash({length: 15});
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

function organization (options={}) {
  const org = {
    id: chance.hash({length : 15}),
    name: chance.string(),
    logo: chance.url(),
  };
  return Object.assign(org, options);
}

function defaultOrganization () {
  return {
    id: '__default__',
    name: 'Hypothesis',
    logo: 'http://example.com/hylogo',
  };
}

function expandedGroup (options={}) {
  const expanded = group();
  expanded.organization = organization();

  return Object.assign(expanded, options);
}

function expandedOrganizations () {
  return [
    {
        id: 'BQg9ywB1',
        name: 'Allez!',
        links: {
          html: 'http://localhost:5000/groups/BQg9ywB1/allez',
        },
        organization: {
          id: 'bumbaorg',
          name: 'Bumbas',
          logo: 'http://www.example.com/bumba',
        },
        type: 'open',
    },
    {
      id: 'MamPRxn8',
      name: 'BumbasActuallyRoll',
      links: {
        html: 'http://localhost:5000/groups/MamPRxn8/bumbasactuallyroll',
      },
      organization: {
        id: 'bumbaorg',
        name: 'Bumbas',
        logo: 'http://www.example.com/bumba',
      },
      type: 'restricted',
    },
    {
      id: 'Q2VaM9wQ',
      name: 'This One is Charmed',
      links: {
        html: 'http://localhost:5000/groups/Q2VaM9wQ/this-one-is-charmed',
      },
      organization: {
        id: '__default__',
        name: 'Hypothesis',
        logo: 'http://www.example.com/logo/hy',
      },
      type: 'open',
    },
    {
      id: '__world__',
      name: 'Public',
      links: {
        html: 'http://localhost:5000/groups/__world__/public',
      },
      organization: {
        id: '__default__',
        name: 'Hypothesis',
        logo: 'http://www.example.com/logo/hy',
      },
      type: 'open',
    },
    {
      id: 'MZgB75MN',
      name: 'Aardvark',
      links: {
        html: 'http://localhost:5000/groups/MXgB75MN/aardvark',
      },
      organization: {
        id: 'arcane',
        name: 'Arcane',
        logo: 'http://www.example.com/logo/arcane',
      },
      type: 'private',
    },
    {
      id: 'V1e22Mgz',
      name: 'Football',
      links: {
        html: 'http://localhost:5000/groups/V1e22Mgz/football',
      },
      organization: {
        id: '__default__',
        name: 'Hypothesis',
        logo: 'http://www.example.com/logo/hy',
      },
      type: 'private',
    },
    {
      id: '38ZNqr52',
      name: 'How Can This Work?',
      links: {
        html: 'http://localhost:5000/groups/38ZNqr53/how-can-this-work',
      },
      organization: {
        id: '__default__',
        name: 'Hypothesis',
        logo: 'http://www.example.com/logo/hy',
      },
      type: 'private',
    },
    {
      id: 'dxp7MRpZ',
      name: 'Lilac',
      links: {
        html: 'http://localhost:5000/groups/dxp7MRpZ/lilac',
      },
      organization: {
        id: 'bumbaorg',
        name: 'Bumbas',
        logo: 'http://www.example.com/bumba',
      },
      type: 'private',
    },
    {
      id: 'bG8e2DL1',
      name: 'Moribund',
      links: {
        html: 'http://localhost:5000/groups/bG8e2DL1/moribund',
      },
      organization: {
        id: 'alchemy',
        name: 'Alchemy',
        logo: 'http://www.example.com/alchemy',
      },
      type: 'private',
    },
  ];
}

module.exports = {
  group,
  expandedGroup,
  organization,
  defaultOrganization,
  expandedOrganizations,
};
