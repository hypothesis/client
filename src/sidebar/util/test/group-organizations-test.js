'use strict';

var groupsByOrganization = require('../group-organizations');
var orgFixtures = require('../../test/group-fixtures');

describe('group-organizations', function () {
  context ('when sorting organizations and their contained groups', function () {

    it ('should put the default organization groups last', function () {
      const defaultOrg = orgFixtures.defaultOrganization();
      const groups = [orgFixtures.expandedGroup({ organization: defaultOrg }),
                      orgFixtures.expandedGroup(),
                      orgFixtures.expandedGroup()];

      const sortedGroups = groupsByOrganization(groups);

      assert.equal(sortedGroups[2].organization.id, defaultOrg.id);
    });

    it ('should sort organizations by name', function () {
      const org1 = orgFixtures.organization({ name: 'zzzzz' });
      const org2 = orgFixtures.organization({ name: 'aaaaa' });
      const org3 = orgFixtures.organization({ name: 'yyyyy' });
      const groups = [orgFixtures.expandedGroup({ organization: org1 }),
                      orgFixtures.expandedGroup({ organization: org2 }),
                      orgFixtures.expandedGroup({ organization: org3 })];

      const sortedGroups = groupsByOrganization(groups);

      assert.equal(sortedGroups[0].organization.name, 'aaaaa');
      assert.equal(sortedGroups[1].organization.name, 'yyyyy');
      assert.equal(sortedGroups[2].organization.name, 'zzzzz');
    });

    it ('should sort organizations secondarily by id', function () {
      const org1 = orgFixtures.organization({ name: 'zzzzz', id: 'zzzzz' });
      const org2 = orgFixtures.organization({ name: 'zzzzz', id: 'aaaaa' });
      const org3 = orgFixtures.organization({ name: 'zzzzz', id: 'yyyyy' });
      const groups = [orgFixtures.expandedGroup({ organization: org1 }),
                      orgFixtures.expandedGroup({ organization: org2 }),
                      orgFixtures.expandedGroup({ organization: org3 })];

      const sortedGroups = groupsByOrganization(groups);

      assert.equal(sortedGroups[0].organization.id, 'aaaaa');
      assert.equal(sortedGroups[1].organization.id, 'yyyyy');
      assert.equal(sortedGroups[2].organization.id, 'zzzzz');
    });

    it ('should only include logo for first group in each organization', function () {
      const org = orgFixtures.organization({ name: 'Aluminum' });
      const org2 = orgFixtures.organization({ name: 'Zirconium' });
      const groups = [
        { name: 'Aluminum', organization: org },
        { name: 'Beryllium', organization: org2},
        { name: 'Butane', organization: org2 },
        { name: 'Cadmium', organization: org},
      ];

      const sortedGroups = groupsByOrganization(groups);

      assert(typeof sortedGroups[0].logo === 'string');
      assert(typeof sortedGroups[1].logo === 'undefined');
      assert(typeof sortedGroups[2].logo === 'string');
      assert(typeof sortedGroups[3].logo === 'undefined');

    });
  });

  context('when encountering missing data', function () {

    it('should be able to sort without any groups in the default org', function () {
      const org = orgFixtures.organization({ name:'Aluminum' });
      const groups = [
        { name: 'Aluminum', organization: org },
        { name: 'Beryllium', organization: org},
        { name: 'Cadmium', organization: org},
      ];

      const sortedGroups = groupsByOrganization(groups);

      sortedGroups.forEach((group, idx) => {
        assert.equal(group.name, groups[idx].name);
      });

    });

    it('should omit any groups without an organization', function () {
      const org = orgFixtures.organization({ name:'Europium' });
      const groups = [
        { name: 'Aluminum', organization: org },
        { name: 'Beryllium', organization: org},
        { name: 'Butane' },
        { name: 'Cadmium', organization: org},
      ];

      const sortedGroups = groupsByOrganization(groups);

      assert.equal(sortedGroups.length, groups.length - 1);
      sortedGroups.forEach(group => {
        assert.notEqual(group.name, 'Butane');
      });
    });

    it('should omit any groups with unexpanded organizations', function () {
      const org = orgFixtures.organization({ name:'Europium' });
      const groups = [
        { name: 'Aluminum', organization: org },
        { name: 'Beryllium', organization: org},
        { name: 'Butane', organization: 'foobar' },
        { name: 'Cadmium', organization: org},
      ];

      const sortedGroups = groupsByOrganization(groups);

      assert.equal(sortedGroups.length, groups.length - 1);
      sortedGroups.forEach(group => {
        assert.notEqual(group.name, 'Butane');
      });

    });

    it ('should omit logo property if not present on organization', function () {
      const org = orgFixtures.organization({ logo: undefined });
      const org2 = orgFixtures.organization({ logo: null });
      const groups = [
        { name: 'Aluminum', organization: org },
        { name: 'Beryllium', organization: org2},
        { name: 'Butane', organization: org2 },
        { name: 'Cadmium', organization: org},
      ];

      const sortedGroups = groupsByOrganization(groups);

      sortedGroups.forEach(group => {
        assert(typeof group.logo === 'undefined');
      });
    });
  });

  context('when building data structures', function () {

    it ('should deep-clone group objects', function () {
      const group = orgFixtures.expandedGroup({name: 'Halfnium'});
      const groups = [group];

      const sortedGroups = groupsByOrganization(groups);
      sortedGroups[0].name = 'Something Else';
      sortedGroups[0].links.html = 'foobar';

      assert(sortedGroups[0] !== group);
      assert(group.name === 'Halfnium');
      assert(group.links.html !== sortedGroups[0].links.html);

    });


    it ('should shallow-clone organization objects', function () {
      const org = orgFixtures.organization({ name: 'Lanthanum' });
      const group = orgFixtures.expandedGroup({
        name: 'Halfnium',
        organization: org,
      });
      const groups = [group];

      const sortedGroups = groupsByOrganization(groups);
      sortedGroups[0].organization.name = 'Tantalum';

      assert(sortedGroups[0].organization !== org);
      assert(org.name !== 'Tantalum');
    });

  });
});
