const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const app = require('../../server/app.js');

const { API_KEY } = process.env;
const {
	setupMocks,
	stubDbUnavailable,
	testNode,
	spyDbQuery,
	verifyNotExists,
} = require('../helpers');

describe('v2 - node PATCH', () => {
	const sandbox = {};
	const namespace = 'v2-node-patch';

	const teamCode = `${namespace}-team`;
	const repoCode = `github:${namespace}`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;
	const systemCode = `${namespace}-system`;

	setupMocks(sandbox, { namespace });

	const testPatchRequest = (url, data, ...expectations) => {
		let req = sandbox
			.request(app)
			.patch(url)
			.namespacedAuth();

		if (data) {
			req = req.send(data);
		}

		return req.expect(...expectations);
	};

	it('update node', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1',
		});
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				name: 'name2',
			},
			200,
			sandbox.withUpdateMeta({
				name: 'name2',
				code: teamCode,
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				name: 'name2',
				code: teamCode,
			}),
		);

		sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['name']]);
	});

	it('Not create property when passed empty string', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1',
		});
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				description: '',
			},
			200,
			sandbox.withUpdateMeta({
				code: teamCode,
				name: 'name1',
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				name: 'name1',
				code: teamCode,
			}),
		);
		sandbox.expectNoEvents();
	});

	describe('temporal properties', () => {
		it('Set Date property when no previous value', async () => {
			const isoDateString = '2019-01-09';
			const date = new Date(isoDateString);
			await sandbox.createNode('System', {
				code: systemCode,
			});
			await testPatchRequest(
				`/v2/node/System/${systemCode}`,
				{ lastServiceReviewDate: date.toISOString() },
				200,
				sandbox.withUpdateMeta({
					code: systemCode,
					lastServiceReviewDate: isoDateString,
				}),
			);

			await testNode(
				'System',
				systemCode,
				sandbox.withUpdateMeta({
					code: systemCode,
					lastServiceReviewDate: isoDateString,
				}),
			);
			sandbox.expectEvents([
				'UPDATE',
				systemCode,
				'System',
				['lastServiceReviewDate'],
			]);
		});

		it('Overwrite existing Date property', async () => {
			const isoDateString = '2019-01-09';
			const date = new Date(isoDateString);
			await sandbox.createNode('System', {
				code: systemCode,
				lastServiceReviewDate: neo4jTemporalTypes.Date.fromStandardDate(
					new Date('2018-01-09'),
				),
			});

			await testPatchRequest(
				`/v2/node/System/${systemCode}`,
				{ lastServiceReviewDate: date.toISOString() },
				200,
				sandbox.withUpdateMeta({
					code: systemCode,
					lastServiceReviewDate: isoDateString,
				}),
			);

			await testNode(
				'System',
				systemCode,
				sandbox.withUpdateMeta({
					code: systemCode,
					lastServiceReviewDate: isoDateString,
				}),
			);
			sandbox.expectEvents([
				'UPDATE',
				systemCode,
				'System',
				['lastServiceReviewDate'],
			]);
		});

		it("Not overwrite when 'same' Date sent", async () => {
			const isoDateString = '2019-01-09';
			const date = new Date(isoDateString);
			await sandbox.createNode('System', {
				code: systemCode,
				lastServiceReviewDate: neo4jTemporalTypes.Date.fromStandardDate(
					date,
				),
			});

			await testPatchRequest(
				`/v2/node/System/${systemCode}`,
				{ lastServiceReviewDate: '2019-01-09' },
				200,
				sandbox.withUpdateMeta({
					code: systemCode,
					lastServiceReviewDate: isoDateString,
				}),
			);

			await testNode(
				'System',
				systemCode,
				sandbox.withUpdateMeta({
					code: systemCode,
					lastServiceReviewDate: isoDateString,
				}),
			);
			sandbox.expectNoEvents();
		});
	});

	it('Remove property when empty string sent in payload', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1',
			description: 'description',
		});
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				description: '',
			},
			200,
			sandbox.withUpdateMeta({
				code: teamCode,
				name: 'name1',
			}),
		);
		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				name: 'name1',
				code: teamCode,
			}),
		);
		sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['description']]);
	});

	it('Not remove property when falsy value sent in payload', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			isActive: true,
		});
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				isActive: false,
			},
			200,
			sandbox.withUpdateMeta({
				code: teamCode,
				isActive: false,
			}),
		);
		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				isActive: false,
				code: teamCode,
			}),
		);
		sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['isActive']]);
	});

	it('Create when patching non-existent node', async () => {
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				name: 'name1',
			},
			201,
			sandbox.withCreateMeta({
				name: 'name1',
				code: teamCode,
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				name: 'name1',
				code: teamCode,
			}),
		);
		sandbox.expectEvents(['CREATE', teamCode, 'Team', ['name', 'code']]);
	});

	it('Not create when patching non-existent restricted node', async () => {
		await testPatchRequest(
			`/v2/node/Repository/${repoCode}`,
			{
				name: 'name1',
			},
			400,
			new RegExp(
				`Repositories can only be created by biz-ops-github-importer`,
			),
		);

		await verifyNotExists('Repository', repoCode);
		sandbox.expectNoEvents();
	});

	it('Create when patching non-existent restricted node with correct client-id', async () => {
		const result = Object.assign(
			sandbox.withCreateMeta({
				name: 'name1',
				code: repoCode,
			}),
			{
				_createdByClient: 'biz-ops-github-importer',
				_updatedByClient: 'biz-ops-github-importer',
			},
		);
		await sandbox
			.request(app)
			.patch(`/v2/node/Repository/${repoCode}`)
			.set('API_KEY', process.env.API_KEY)
			.set('client-user-id', `${namespace}-user`)
			.set('x-request-id', `${namespace}-request`)
			.set('client-id', 'biz-ops-github-importer')
			.send({
				name: 'name1',
			})
			.expect(201, result);

		await testNode('Repository', repoCode, result);
		sandbox.expectEvents([
			'CREATE',
			repoCode,
			'Repository',
			['name', 'code'],
			'biz-ops-github-importer',
		]);
	});

	it('error when conflicting code values', async () => {
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				code: 'wrong-code',
			},
			400,
			new RegExp(
				`Conflicting code property \`wrong-code\` in payload for Team ${teamCode}`,
			),
		);
		await verifyNotExists('Team', teamCode);
		sandbox.expectNoEvents();
	});

	it('not error when non-conflicting code values', async () => {
		await sandbox.createNode('Team', teamCode);
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				name: 'name1',
				code: teamCode,
			},
			200,
		);
		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				name: 'name1',
				code: teamCode,
			}),
		);
		sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['name']]);
	});

	it('error when unrecognised attribute', async () => {
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				foo: 'unrecognised',
			},
			400,
			/Invalid property `foo` on type `Team`/,
		);
		await verifyNotExists('Team', teamCode);
		sandbox.expectNoEvents();
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		await testPatchRequest(`/v2/node/Team/${teamCode}`, {}, 500);
		sandbox.expectNoEvents();
	});

	it("deletes attributes which are provided as 'null'", async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1',
		});
		await testPatchRequest(
			`/v2/node/Team/${teamCode}`,
			{
				name: null,
			},
			200,
			sandbox.withUpdateMeta({
				code: teamCode,
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				code: teamCode,
			}),
		);
		sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['name']]);
	});

	it('no client-id header deletes the _updatedByClient metaProperty from the database', async () => {
		await sandbox.createNode('Team', {
			code: `${namespace}-team`,
			name: 'name1',
		});
		const expectedMeta = sandbox.withUpdateMeta({
			name: 'name2',
			code: teamCode,
		});
		delete expectedMeta._updatedByClient;
		return sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.set('API_KEY', API_KEY)
			.set('client-user-id', `${namespace}-user`)
			.set('x-request-id', `${namespace}-request`)
			.send({ name: 'name2' })
			.expect(200, expectedMeta);
	});

	it('no client-user-id header deletes the _updatedByUser metaProperty from the database', async () => {
		await sandbox.createNode('Team', {
			code: `${namespace}-team`,
			name: 'name1',
		});
		const expectedMeta = sandbox.withUpdateMeta({
			name: 'name2',
			code: teamCode,
		});
		delete expectedMeta._updatedByUser;
		return sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.set('API_KEY', API_KEY)
			.set('client-id', `${namespace}-client`)
			.set('x-request-id', `${namespace}-request`)
			.send({ name: 'name2' })
			.expect(200, expectedMeta);
	});

	describe('relationship patching', () => {
		describe('deleting', () => {
			it('errors if no relationshipAction query string when deleting relationship set', async () => {
				await sandbox.createNode('Team', teamCode);
				await testPatchRequest(
					`/v2/node/Team/${teamCode}`,
					{
						techLeads: null,
					},
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/,
				);
				sandbox.expectNoEvents();
			});

			it('errors if no relationshipAction query string when deleting individual relationship', async () => {
				await sandbox.createNode('Team', teamCode);
				await testPatchRequest(
					`/v2/node/Team/${teamCode}`,
					{
						'!techLeads': [personCode],
					},
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/,
				);
				sandbox.expectNoEvents();
			});
			['merge', 'replace'].forEach(action =>
				describe(`with ${action} action`, () => {
					describe('individual relationship delete', () => {
						it('can delete a specific relationship', async () => {
							const [
								team,
								person1,
								person2,
							] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`],
								['Person', `${personCode}-2`],
							);
							await sandbox.connectNodes(
								[team, 'HAS_TECH_LEAD', person1],
								[team, 'HAS_TECH_LEAD', person2],
							);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [`${personCode}-1`] },
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-2`],
								}),
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withMeta({
											code: `${personCode}-2`,
										}),
									},
								],
							);
							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team', ['techLeads']],
								[
									'UPDATE',
									`${personCode}-1`,
									'Person',
									['techLeadFor'],
								],
							);
						});

						it("can attempt to delete a specific relationship of type that doesn't exist", async () => {
							await sandbox.createNode('Team', teamCode);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [personCode] },
								200,
								sandbox.withMeta({
									code: teamCode,
								}),
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
							);
							sandbox.expectNoEvents();
						});

						it("can attempt to delete a specific relationship that doesn't exist", async () => {
							const [team, person1] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`],
							);
							await sandbox.connectNodes([
								team,
								'HAS_TECH_LEAD',
								person1,
							]);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [`${personCode}-2`] },
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-1`],
								}),
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withMeta({
											code: `${personCode}-1`,
										}),
									},
								],
							);
							sandbox.expectNoEvents();
						});

						it('can delete multiple specific relationships of the same kind', async () => {
							const [
								team,
								person1,
								person2,
								person3,
							] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`],
								['Person', `${personCode}-2`],
								['Person', `${personCode}-3`],
							);
							await sandbox.connectNodes(
								[team, 'HAS_TECH_LEAD', person1],
								[team, 'HAS_TECH_LEAD', person2],
								[team, 'HAS_TECH_LEAD', person3],
							);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [
										`${personCode}-1`,
										`${personCode}-3`,
									],
								},
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-2`],
								}),
							);
							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withMeta({
											code: `${personCode}-2`,
										}),
									},
								],
							);
							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team', ['techLeads']],
								[
									'UPDATE',
									`${personCode}-1`,
									'Person',
									['techLeadFor'],
								],
								[
									'UPDATE',
									`${personCode}-3`,
									'Person',
									['techLeadFor'],
								],
							);
						});

						it('can delete multiple specific relationships of different kinds', async () => {
							const [
								team,
								person,
								group,
							] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', personCode],
								['Group', groupCode],
							);
							await sandbox.connectNodes(
								[team, 'HAS_TECH_LEAD', person],
								[group, 'HAS_TEAM', team],
							);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [personCode],
									'!parentGroup': groupCode,
								},
								200,
								sandbox.withMeta({
									code: teamCode,
								}),
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
							);
							sandbox.expectEvents(
								[
									'UPDATE',
									teamCode,
									'Team',
									['techLeads', 'parentGroup', 'group'],
								],
								[
									'UPDATE',
									personCode,
									'Person',
									['techLeadFor'],
								],
								[
									'UPDATE',
									groupCode,
									'Group',
									['allTeams', 'topLevelTeams'],
								],
							);
						});
						it('leaves relationships in the opposite direction unaffected', async () => {
							const [
								team1,
								team2,
								team3,
							] = await sandbox.createNodes(
								['Team', `${teamCode}-1`],
								['Team', `${teamCode}-2`],
								['Team', `${teamCode}-3`],
							);
							await sandbox.connectNodes(
								[team1, 'HAS_TEAM', team2],
								[team2, 'HAS_TEAM', team3],
							);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`,
								{ '!subTeams': [`${teamCode}-3`] },
								200,
								sandbox.withMeta({
									code: `${teamCode}-2`,
									parentTeam: `${teamCode}-1`,
								}),
							);

							await testNode(
								'Team',
								`${teamCode}-2`,
								sandbox.withMeta({
									code: `${teamCode}-2`,
								}),
								[
									{
										type: 'HAS_TEAM',
										direction: 'incoming',
										props: sandbox.withMeta({}),
									},
									{
										type: 'Team',
										props: sandbox.withMeta({
											code: `${teamCode}-1`,
										}),
									},
								],
							);
							sandbox.expectEvents(
								[
									'UPDATE',
									`${teamCode}-3`,
									'Team',
									['parentTeam'],
								],
								[
									'UPDATE',
									`${teamCode}-2`,
									'Team',
									['subTeams'],
								],
							);
						});
						it('can add and remove relationships of the same type at the same time', async () => {
							const [team, person1] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`],
								['Person', `${personCode}-2`],
							);
							await sandbox.connectNodes([
								team,
								'HAS_TECH_LEAD',
								person1,
							]);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [`${personCode}-1`],
									techLeads: [`${personCode}-2`],
								},
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-2`],
								}),
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withMeta({
											code: `${personCode}-2`,
										}),
									},
								],
							);
							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team', ['techLeads']],
								[
									'UPDATE',
									`${personCode}-1`,
									'Person',
									['techLeadFor'],
								],
								[
									'UPDATE',
									`${personCode}-2`,
									'Person',
									['techLeadFor'],
								],
							);
						});
						it('errors if deleting and adding the same relationship to the same record', async () => {
							await sandbox.createNodes(
								['Team', teamCode],
								['Person', personCode],
							);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									techLeads: [personCode],
									'!techLeads': [personCode],
								},
								400,
								/Trying to add and remove a relationship to a record at the same time/,
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
							);
							sandbox.expectNoEvents();
						});
					});

					describe('bulk relationship delete', () => {
						it('can delete empty relationship set', async () => {
							await sandbox.createNode('Team', teamCode);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ techLeads: null },
								200,
								sandbox.withMeta({
									code: teamCode,
								}),
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
							);
							sandbox.expectNoEvents();
						});

						it('can delete entire relationship sets', async () => {
							const [
								team,
								person,
								group,
							] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', personCode],
								['Group', groupCode],
							);
							await sandbox.connectNodes(
								// tests incoming and outgoing relationships
								[group, 'HAS_TEAM', team],
								[team, 'HAS_TECH_LEAD', person],
							);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ techLeads: null, parentGroup: null },
								200,
								sandbox.withMeta({
									code: teamCode,
								}),
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
							);

							sandbox.expectEvents(
								[
									'UPDATE',
									teamCode,
									'Team',
									['techLeads', 'parentGroup', 'group'],
								],
								[
									'UPDATE',
									personCode,
									'Person',
									['techLeadFor'],
								],
								[
									'UPDATE',
									groupCode,
									'Group',
									['allTeams', 'topLevelTeams'],
								],
							);
						});

						it('leaves other similar relationships on destination node untouched when deleting', async () => {
							const [
								team1,
								team2,
								person,
							] = await sandbox.createNodes(
								['Team', `${teamCode}-1`],
								['Team', `${teamCode}-2`],
								['Person', personCode],
							);
							await sandbox.connectNodes([
								team1,
								'HAS_TECH_LEAD',
								person,
							]);
							await sandbox.connectNodes([
								team2,
								'HAS_TECH_LEAD',
								person,
							]);

							await testPatchRequest(
								`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`,
								{
									techLeads: null,
								},
								200,
								sandbox.withMeta({
									code: `${teamCode}-2`,
								}),
							);

							await testNode(
								'Team',
								`${teamCode}-1`,
								sandbox.withMeta({
									code: `${teamCode}-1`,
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withMeta({
											code: personCode,
										}),
									},
								],
							);

							sandbox.expectEvents(
								[
									'UPDATE',
									`${teamCode}-2`,
									'Team',
									['techLeads'],
								],
								[
									'UPDATE',
									personCode,
									'Person',
									['techLeadFor'],
								],
							);
						});

						it('leaves relationships in other direction and of other types untouched when deleting', async () => {
							const [
								team1,
								team2,
								team3,
								person,
							] = await sandbox.createNodes(
								['Team', `${teamCode}-1`],
								['Team', `${teamCode}-2`],
								['Team', `${teamCode}-3`],
								['Person', personCode],
							);
							await sandbox.connectNodes([
								team1,
								'HAS_TEAM',
								team2,
							]);
							await sandbox.connectNodes([
								team2,
								'HAS_TEAM',
								team3,
							]);
							await sandbox.connectNodes([
								team2,
								'HAS_TECH_LEAD',
								person,
							]);

							await testPatchRequest(
								`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`,
								{
									subTeams: null,
								},
								200,
								sandbox.withMeta({
									code: `${teamCode}-2`,
									parentTeam: `${teamCode}-1`,
									techLeads: [personCode],
								}),
							);

							await testNode(
								'Team',
								`${teamCode}-2`,
								sandbox.withMeta({
									code: `${teamCode}-2`,
								}),
								[
									{
										type: 'HAS_TEAM',
										direction: 'incoming',
										props: sandbox.withMeta({}),
									},
									{
										type: 'Team',
										props: sandbox.withMeta({
											code: `${teamCode}-1`,
										}),
									},
								],
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withMeta({
											code: personCode,
										}),
									},
								],
							);

							sandbox.expectEvents(
								[
									'UPDATE',
									`${teamCode}-2`,
									'Team',
									['subTeams'],
								],
								[
									'UPDATE',
									`${teamCode}-3`,
									'Team',
									['parentTeam'],
								],
							);
						});
					});
				}),
			);
		});
		describe('creating', () => {
			it('errors if updating relationships without relationshipAction query string', async () => {
				await sandbox.createNode('Team', teamCode);
				await testPatchRequest(
					`/v2/node/Team/${teamCode}`,
					{
						techLeads: [personCode],
					},
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/,
				);

				await testNode(
					'Team',
					teamCode,
					sandbox.withMeta({ code: teamCode }),
				);
				sandbox.expectNoEvents();
			});

			describe('__-to-one relationships', () => {
				['merge', 'replace'].forEach(action => {
					it('accept a string', async () => {
						await sandbox.createNodes(
							['Team', teamCode],
							['Group', groupCode],
						);
						await testPatchRequest(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: groupCode,
							},
							200,
							sandbox.withMeta({
								code: teamCode,
								parentGroup: groupCode,
							}),
						);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode,
							}),
							[
								{
									type: 'HAS_TEAM',
									direction: 'incoming',
									props: sandbox.withCreateMeta({}),
								},
								{
									type: 'Group',
									props: sandbox.withMeta({
										code: groupCode,
									}),
								},
							],
						);

						sandbox.expectEvents(
							[
								'UPDATE',
								teamCode,
								'Team',
								['parentGroup', 'group'],
							],
							[
								'UPDATE',
								groupCode,
								'Group',
								['allTeams', 'topLevelTeams'],
							],
						);
					});
					it('accept an array of length one', async () => {
						await sandbox.createNodes(
							['Team', teamCode],
							['Group', groupCode],
						);
						await testPatchRequest(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [groupCode],
							},
							200,
							sandbox.withMeta({
								code: teamCode,
								parentGroup: groupCode,
							}),
						);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode,
							}),
							[
								{
									type: 'HAS_TEAM',
									direction: 'incoming',
									props: sandbox.withCreateMeta({}),
								},
								{
									type: 'Group',
									props: sandbox.withMeta({
										code: groupCode,
									}),
								},
							],
						);

						sandbox.expectEvents(
							[
								'UPDATE',
								teamCode,
								'Team',
								['parentGroup', 'group'],
							],
							[
								'UPDATE',
								groupCode,
								'Group',
								['allTeams', 'topLevelTeams'],
							],
						);
					});
					it('error if trying to write multiple relationships', async () => {
						await sandbox.createNodes(
							['Team', teamCode],
							['Group', `${groupCode}-1`],
							['Group', `${groupCode}-2`],
						);
						await testPatchRequest(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [
									`${groupCode}-1`,
									`${groupCode}-2`,
								],
							},
							400,
							/Can only have one parentGroup/,
						);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode,
							}),
						);

						sandbox.expectNoEvents();
					});

					it('replace existing relationship', async () => {
						const [team, group1] = await sandbox.createNodes(
							['Team', teamCode],
							['Group', `${groupCode}-1`],
							['Group', `${groupCode}-2`],
						);

						await sandbox.connectNodes(group1, 'HAS_TEAM', team);
						await testPatchRequest(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [`${groupCode}-2`],
							},
							200,
							sandbox.withMeta({
								code: teamCode,
								parentGroup: `${groupCode}-2`,
							}),
						);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode,
							}),
							[
								{
									type: 'HAS_TEAM',
									direction: 'incoming',
									props: sandbox.withCreateMeta({}),
								},
								{
									type: 'Group',
									props: sandbox.withMeta({
										code: `${groupCode}-2`,
									}),
								},
							],
						);

						sandbox.expectEvents(
							[
								'UPDATE',
								teamCode,
								'Team',
								['parentGroup', 'group'],
							],
							[
								'UPDATE',
								`${groupCode}-1`,
								'Group',
								['allTeams', 'topLevelTeams'],
							],
							[
								'UPDATE',
								`${groupCode}-2`,
								'Group',
								['allTeams', 'topLevelTeams'],
							],
						);
					});

					it.skip('not replace existing relationship in opposite direction', async () => {
						// schema doesn't support any one-to-one relationships in both directions, so not possible to test this yet,
					});
				});
			});

			describe('merge', () => {
				it('can merge with empty relationship set if relationshipAction=merge', async () => {
					await sandbox.createNodes(
						['Team', teamCode],
						['Person', personCode],
					);
					await testPatchRequest(
						`/v2/node/Team/${teamCode}?relationshipAction=merge`,
						{
							techLeads: [personCode],
						},
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [personCode],
						}),
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode,
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: personCode }),
							},
						],
					);
					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team', ['techLeads']],
						['UPDATE', personCode, 'Person', ['techLeadFor']],
					);
				});
				it('can merge with relationships if relationshipAction=merge', async () => {
					const [team, person1] = await sandbox.createNodes(
						['Team', teamCode],
						['Person', `${personCode}-1`],
						['Person', `${personCode}-2`],
					);
					await sandbox.connectNodes(
						team,
						['HAS_TECH_LEAD'],
						person1,
					);

					await testPatchRequest(
						`/v2/node/Team/${teamCode}?relationshipAction=merge`,
						{
							techLeads: [`${personCode}-2`],
						},
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [`${personCode}-2`, `${personCode}-1`],
						}),
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode,
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withMeta({}),
							},
							{
								type: 'Person',
								props: sandbox.withMeta({
									code: `${personCode}-1`,
								}),
							},
						],
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'Person',
								props: sandbox.withMeta({
									code: `${personCode}-2`,
								}),
							},
						],
					);
					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team', ['techLeads']],
						[
							'UPDATE',
							`${personCode}-2`,
							'Person',
							['techLeadFor'],
						],
					);
				});
			});

			describe('replace', () => {
				it('can replace an empty relationship set if relationshipAction=replace', async () => {
					await sandbox.createNodes(
						['Team', teamCode],
						['Person', personCode],
					);
					await testPatchRequest(
						`/v2/node/Team/${teamCode}?relationshipAction=replace`,
						{
							techLeads: [personCode],
						},
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [personCode],
						}),
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode,
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: personCode }),
							},
						],
					);

					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team', ['techLeads']],
						['UPDATE', personCode, 'Person', ['techLeadFor']],
					);
				});

				it('can replace relationships if relationshipAction=replace', async () => {
					const [team, person1] = await sandbox.createNodes(
						['Team', teamCode],
						['Person', `${personCode}-1`],
						['Person', `${personCode}-2`],
					);
					await sandbox.connectNodes(
						team,
						['HAS_TECH_LEAD'],
						person1,
					);

					await testPatchRequest(
						`/v2/node/Team/${teamCode}?relationshipAction=replace`,
						{
							techLeads: [`${personCode}-2`],
						},
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [`${personCode}-2`],
						}),
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode,
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'Person',
								props: sandbox.withMeta({
									code: `${personCode}-2`,
								}),
							},
						],
					);
					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team', ['techLeads']],
						[
							'UPDATE',
							`${personCode}-1`,
							'Person',
							['techLeadFor'],
						],
						[
							'UPDATE',
							`${personCode}-2`,
							'Person',
							['techLeadFor'],
						],
					);
				});

				it('leaves relationships in other direction and of other types untouched when replacing', async () => {
					const [team1, team2, , person] = await sandbox.createNodes(
						['Team', `${teamCode}-1`],
						['Team', `${teamCode}-2`],
						['Team', `${teamCode}-3`],
						['Person', personCode],
					);
					await sandbox.connectNodes([team1, 'HAS_TEAM', team2]);
					await sandbox.connectNodes([
						team2,
						'HAS_TECH_LEAD',
						person,
					]);

					await testPatchRequest(
						`/v2/node/Team/${teamCode}-2?relationshipAction=replace`,
						{
							subTeams: [`${teamCode}-3`],
						},
						200,
						sandbox.withMeta({
							code: `${teamCode}-2`,
							subTeams: [`${teamCode}-3`],
							parentTeam: `${teamCode}-1`,
							techLeads: [personCode],
						}),
					);

					await testNode(
						'Team',
						`${teamCode}-2`,
						sandbox.withMeta({
							code: `${teamCode}-2`,
						}),
						[
							{
								type: 'HAS_TEAM',
								direction: 'incoming',
								props: sandbox.withMeta({}),
							},
							{
								type: 'Team',
								props: sandbox.withMeta({
									code: `${teamCode}-1`,
								}),
							},
						],
						[
							{
								type: 'HAS_TEAM',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'Team',
								props: sandbox.withMeta({
									code: `${teamCode}-3`,
								}),
							},
						],
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withMeta({}),
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: personCode }),
							},
						],
					);

					sandbox.expectEvents(
						['UPDATE', `${teamCode}-2`, 'Team', ['subTeams']],
						['UPDATE', `${teamCode}-3`, 'Team', ['parentTeam']],
					);
				});

				it('replaces relationships in multiple directions', async () => {
					const [team1, team2, team3] = await sandbox.createNodes(
						['Team', `${teamCode}-1`],
						['Team', `${teamCode}-2`],
						['Team', `${teamCode}-3`],
					);
					await sandbox.connectNodes([team1, 'HAS_TEAM', team2]);
					await sandbox.connectNodes([team2, 'HAS_TEAM', team3]);

					await testPatchRequest(
						`/v2/node/Team/${teamCode}-2?relationshipAction=replace`,
						{
							subTeams: [`${teamCode}-1`],
							parentTeam: `${teamCode}-3`,
						},
						200,
						sandbox.withMeta({
							code: `${teamCode}-2`,
							subTeams: [`${teamCode}-1`],
							parentTeam: `${teamCode}-3`,
						}),
					);

					await testNode(
						'Team',
						`${teamCode}-2`,
						sandbox.withMeta({
							code: `${teamCode}-2`,
						}),
						[
							{
								type: 'HAS_TEAM',
								direction: 'incoming',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'Team',
								props: sandbox.withMeta({
									code: `${teamCode}-3`,
								}),
							},
						],
						[
							{
								type: 'HAS_TEAM',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'Team',
								props: sandbox.withMeta({
									code: `${teamCode}-1`,
								}),
							},
						],
					);
					sandbox.expectEvents(
						[
							'UPDATE',
							`${teamCode}-1`,
							'Team',
							['subTeams', 'parentTeam'],
						],
						[
							'UPDATE',
							`${teamCode}-2`,
							'Team',
							['subTeams', 'parentTeam'],
						],
						[
							'UPDATE',
							`${teamCode}-3`,
							'Team',
							['subTeams', 'parentTeam'],
						],
					);
				});
			});

			describe('upsert', () => {
				['merge', 'replace'].forEach(action => {
					describe(`with ${action}`, () => {
						it(`error when relationship to non-existent node`, async () => {
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									techLeads: [personCode],
								},
								400,
								/Missing related node/,
							);
							sandbox.expectNoEvents();
						});

						it('create node related to non-existent nodes when using upsert=true', async () => {
							await sandbox.createNode('Team', teamCode);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`,
								{
									techLeads: [personCode],
								},
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [personCode],
								}),
							);
							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withCreateMeta({
											code: personCode,
										}),
									},
								],
							);

							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team', ['techLeads']],
								[
									'CREATE',
									personCode,
									'Person',
									['code', 'techLeadFor'],
								],
							);
						});

						it('not leave creation artifacts on things that already existed when using `upsert=true`', async () => {
							await sandbox.createNode('Team', teamCode);
							await sandbox.createNode('Person', personCode);
							await testPatchRequest(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`,
								{
									techLeads: [personCode],
								},
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [personCode],
								}),
							);
							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode,
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({}),
									},
									{
										type: 'Person',
										props: sandbox.withMeta({
											code: personCode,
										}),
									},
								],
							);

							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team', ['techLeads']],
								[
									'UPDATE',
									personCode,
									'Person',
									['techLeadFor'],
								],
							);
						});
					});
				});
			});
		});
	});

	describe('diffing before writes', () => {
		it("doesn't write if no real property changes detected", async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name-1',
			});
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
				{
					name: 'name-1',
				},
				200,
			);

			dbQuerySpy().args.forEach(args => {
				expect(args[0]).not.toMatch(/MERGE|CREATE/);
			});
			sandbox.expectNoEvents();
		});

		it("doesn't write if no real relationship changes detected in REPLACE mode", async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode],
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
				{ techLeads: [personCode] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(false);
			sandbox.expectNoEvents();
		});

		it("doesn't write if no real relationship changes detected in MERGE mode", async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode],
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ techLeads: [personCode] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(false);
			sandbox.expectNoEvents();
		});

		it("doesn't write if no real lockField changes detected", async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
			});
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
				{},
				200,
			);

			dbQuerySpy().args.forEach(args => {
				expect(args[0]).not.toMatch(/MERGE|CREATE/);
			});
			sandbox.expectNoEvents();
		});

		it('writes if property but no relationship changes detected', async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode],
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: 'new-name', techLeads: [personCode] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(true);
			sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['name']]);
		});

		it('writes if relationship but no property changes detected', async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', { code: teamCode, name: 'name' }],
				['Person', `${personCode}-1`],
				['Person', `${personCode}-2`],
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: 'name', techLeads: [`${personCode}-2`] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(true);
			sandbox.expectEvents(
				['UPDATE', teamCode, 'Team', ['techLeads']],
				['UPDATE', `${personCode}-2`, 'Person', ['techLeadFor']],
			);
		});

		it('detects deleted property as a change', async () => {
			await sandbox.createNode('Team', { code: teamCode, name: 'name' });
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: null },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(true);
			sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['name']]);
		});

		describe('patching with fewer relationships', () => {
			it('treats fewer relationships as a delete when replacing relationships', async () => {
				const [team, person1, person2] = await sandbox.createNodes(
					['Team', teamCode],
					['Person', `${personCode}-1`],
					['Person', `${personCode}-2`],
				);
				await sandbox.connectNodes(
					[team, 'HAS_TECH_LEAD', person1],
					[team, 'HAS_TECH_LEAD', person2],
				);
				const dbQuerySpy = spyDbQuery(sandbox);
				await testPatchRequest(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
					{
						techLeads: [`${personCode}-1`],
					},
					200,
				);

				expect(
					dbQuerySpy().args.some(args =>
						/MERGE|CREATE/.test(args[0]),
					),
				).toBe(true);
				sandbox.expectEvents(
					['UPDATE', teamCode, 'Team', ['techLeads']],
					['UPDATE', `${personCode}-2`, 'Person', ['techLeadFor']],
				);
			});

			it('treats fewer relationships as no change when merging relationships', async () => {
				const [team, person1, person2] = await sandbox.createNodes(
					['Team', teamCode],
					['Person', `${personCode}-1`],
					['Person', `${personCode}-2`],
				);
				await sandbox.connectNodes(
					[team, 'HAS_TECH_LEAD', person1],
					[team, 'HAS_TECH_LEAD', person2],
				);
				const dbQuerySpy = spyDbQuery(sandbox);
				await testPatchRequest(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
					{
						techLeads: [`${personCode}-1`],
					},
					200,
				);

				expect(
					dbQuerySpy().args.some(args =>
						/MERGE|CREATE/.test(args[0]),
					),
				).toBe(false);
				sandbox.expectNoEvents();
			});
		});
	});
});
