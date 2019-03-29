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
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;
	const systemCode = `${namespace}-system`;
	let authenticatedPatch;

	setupMocks(sandbox, { namespace });
	beforeEach(() => {
		authenticatedPatch = (url, data) =>
			sandbox
				.request(app)
				.patch(url)
				.namespacedAuth()
				.send(data);
	});

	it('update node', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1',
		});
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: 'name2',
		}).expect(
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
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			description: '',
		}).expect(
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
			await sandbox
				.request(app)
				.patch(`/v2/node/System/${systemCode}`)
				.namespacedAuth()
				.send({ lastServiceReviewDate: date.toISOString() })
				.expect(
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

			await sandbox
				.request(app)
				.patch(`/v2/node/System/${systemCode}`)
				.namespacedAuth()
				.send({ lastServiceReviewDate: date.toISOString() })
				.expect(
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

			await sandbox
				.request(app)
				.patch(`/v2/node/System/${systemCode}`)
				.namespacedAuth()
				.send({ lastServiceReviewDate: '2019-01-09' })
				.expect(
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
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			description: '',
		}).expect(
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
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			isActive: false,
		}).expect(
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
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: 'name1',
		}).expect(
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

	it('error when conflicting code values', async () => {
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			code: 'wrong-code',
		}).expect(
			400,
			new RegExp(
				`Conflicting code property \`wrong-code\` in payload for Team ${teamCode}`,
			),
		);
		verifyNotExists('Team', teamCode);
		sandbox.expectNoEvents();
	});

	it('not error when non-conflicting code values', async () => {
		await sandbox.createNode('Team', teamCode);
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: 'name1',
			code: teamCode,
		}).expect(200);

		sandbox.expectEvents(['UPDATE', teamCode, 'Team', ['name']]);
	});

	it('error when unrecognised attribute', async () => {
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			foo: 'unrecognised',
		}).expect(400, /Invalid property `foo` on type `Team`/);
		verifyNotExists('Team', teamCode);
		sandbox.expectNoEvents();
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {}).expect(500);
		sandbox.expectNoEvents();
	});

	it("deletes attributes which are provided as 'null'", async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1',
		});
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: null,
		}).expect(
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
				await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
					techLeads: null,
				}).expect(
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/,
				);
				sandbox.expectNoEvents();
			});

			it('errors if no relationshipAction query string when deleting individual relationship', async () => {
				await sandbox.createNode('Team', teamCode);
				await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
					'!techLeads': [personCode],
				}).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [`${personCode}-1`] },
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [personCode] },
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [`${personCode}-2`] },
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [
										`${personCode}-1`,
										`${personCode}-3`,
									],
								},
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [personCode],
									'!parentGroup': groupCode,
								},
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`,
								{ '!subTeams': [`${teamCode}-3`] },
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [`${personCode}-1`],
									techLeads: [`${personCode}-2`],
								},
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									techLeads: [personCode],
									'!techLeads': [personCode],
								},
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ techLeads: null },
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ techLeads: null, parentGroup: null },
							).expect(
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

							await authenticatedPatch(
								`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`,
								{
									subTeams: null,
								},
							).expect(
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
				await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
					techLeads: [personCode],
				}).expect(
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
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: groupCode,
							},
						).expect(
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
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [groupCode],
							},
						).expect(
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
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [
									`${groupCode}-1`,
									`${groupCode}-2`,
								],
							},
						).expect(400, /Can only have one parentGroup/);

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
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [`${groupCode}-2`],
							},
						).expect(
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
					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=merge`,
						{
							techLeads: [personCode],
						},
					).expect(
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

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=merge`,
						{
							techLeads: [`${personCode}-2`],
						},
					).expect(
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
					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=replace`,
						{
							techLeads: [personCode],
						},
					).expect(
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

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=replace`,
						{
							techLeads: [`${personCode}-2`],
						},
					).expect(
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

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}-2?relationshipAction=replace`,
						{
							subTeams: [`${teamCode}-3`],
						},
					).expect(
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

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}-2?relationshipAction=replace`,
						{
							subTeams: [`${teamCode}-1`],
							parentTeam: `${teamCode}-3`,
						},
					).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									techLeads: [personCode],
								},
							).expect(400, /Missing related node/);
							sandbox.expectNoEvents();
						});

						it('create node related to non-existent nodes when using upsert=true', async () => {
							await sandbox.createNode('Team', teamCode);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`,
								{
									techLeads: [personCode],
								},
							).expect(
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
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`,
								{
									techLeads: [personCode],
								},
							).expect(
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
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
				{
					name: 'name-1',
				},
			).expect(200);

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
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
				{ techLeads: [personCode] },
			).expect(200);

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
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ techLeads: [personCode] },
			).expect(200);

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
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
			).expect(200);

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
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: 'new-name', techLeads: [personCode] },
			).expect(200);

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
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: 'name', techLeads: [`${personCode}-2`] },
			).expect(200);

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
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: null },
			).expect(200);

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
				await authenticatedPatch(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
					{
						techLeads: [`${personCode}-1`],
					},
				).expect(200);

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
				await authenticatedPatch(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
					{
						techLeads: [`${personCode}-1`],
					},
				).expect(200);

				expect(
					dbQuerySpy().args.some(args =>
						/MERGE|CREATE/.test(args[0]),
					),
				).toBe(false);
				sandbox.expectNoEvents();
			});
		});
	});

	describe('lockedFields', () => {
		const lockedFieldName = '{"name":"v2-node-patch-client"}';
		const lockedFieldEmail = '{"email":"v2-node-patch-client"}';

		it('throws an error when trying to update a node that is locked by another clientId', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				_lockedFields: '{"name":"admin"}',
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
			).expect(400);
		});

		it('updates node by updating name and locking ALL fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=all`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: `{"code":"v2-node-patch-client","name":"v2-node-patch-client","description":"v2-node-patch-client","email":"v2-node-patch-client","slack":"v2-node-patch-client","phone":"v2-node-patch-client","isActive":"v2-node-patch-client","isThirdParty":"v2-node-patch-client","supportRota":"v2-node-patch-client","contactPref":"v2-node-patch-client","techLeads":"v2-node-patch-client","productOwners":"v2-node-patch-client","parentGroup":"v2-node-patch-client","group":"v2-node-patch-client","subTeams":"v2-node-patch-client","parentTeam":"v2-node-patch-client","delivers":"v2-node-patch-client","supports":"v2-node-patch-client","teamMembers":"v2-node-patch-client"}`,
				}),
			);
		});

		it('updates node by updating name and adding it as a locked field', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('updates node that is locked by this clientId', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldName,
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('does NOT update node with locked field when it is has already locked it (no duplicates)', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldEmail,
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=email`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldEmail,
				}),
			);
		});

		it('adds another field to locked fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldEmail,
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields:
						'{"name":"v2-node-patch-client","email":"v2-node-patch-client"}',
				}),
			);
		});

		it('does NOT lock existing fields when those fields are locked by another clientId', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldEmail,
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=email`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldEmail,
				}),
			);
		});

		it('does NOT lock fields when just updating locked and unlocked fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				email: 'email@example.com',
				slack: 'slack channel',
				_lockedFields: lockedFieldName,
			});
			await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
				name: 'new name',
				email: 'tech@lt.com',
				slack: 'new slack channel',
			}).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
				}),
			);
		});

		it('only locks fields that are given in the query but updates all fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				email: 'email@example.com',
				slack: 'slack channel',
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('creates a new node with locked fields when no exisitng node exists', async () => {
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
				},
			).expect(
				201,
				sandbox.withCreateMeta({
					code: teamCode,
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('does NOT overwrite existing locked fields when lockFields=all is set', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: '{"email":"another-api"}',
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=all`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: `{"code":"v2-node-patch-client","name":"v2-node-patch-client","description":"v2-node-patch-client","email":"another-api","slack":"v2-node-patch-client","phone":"v2-node-patch-client","isActive":"v2-node-patch-client","isThirdParty":"v2-node-patch-client","supportRota":"v2-node-patch-client","contactPref":"v2-node-patch-client","techLeads":"v2-node-patch-client","productOwners":"v2-node-patch-client","parentGroup":"v2-node-patch-client","group":"v2-node-patch-client","subTeams":"v2-node-patch-client","parentTeam":"v2-node-patch-client","delivers":"v2-node-patch-client","supports":"v2-node-patch-client","teamMembers":"v2-node-patch-client"}`,
				}),
			);
		});

		it('can lock fields without having to make any data changes', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?lockFields=name`,
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					_lockedFields: lockedFieldName,
				}),
			);
		});

		describe('no client-id header', () => {
			setupMocks(sandbox, { namespace }, false);

			it('throws an error when clientId is not set', async () => {
				await sandbox
					.request(app)
					.post(`/v2/node/Team/${teamCode}?lockFields=all`)
					.namespacedAuth()
					.send({ name: 'name1' })
					.expect(
						400,
						/clientId needs to be set to a valid system code in order to lock fields/,
					);
			});
		});
	});

	describe('unlocking fields', () => {
		it('unlocks fields when request is given', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: '{"email":"v2-node-patch-client"}',
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?unlockFields=email`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
				}),
			);
		});

		it('unlocks fields when request is given by a different clientId that locked it', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: '{"email":"another-api"}',
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?unlockFields=email`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
				}),
			);
		});

		it('unlocks `all` fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: `{"code":"v2-node-patch-client","name":"v2-node-patch-client"}`,
			});
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?unlockFields=all`,
				{
					name: 'new name',
				},
			).expect(
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
				}),
			);
		});

		describe('no value changes', () => {
			it('unlocks `all` fields', async () => {
				await sandbox.createNode('Team', {
					code: teamCode,
					_lockedFields: `{"code":"v2-node-patch-client","name":"v2-node-patch-client"}`,
				});
				await authenticatedPatch(
					`/v2/node/Team/${teamCode}?unlockFields=all`,
				).expect(
					200,
					sandbox.withMeta({
						code: teamCode,
					}),
				);
			});

			it('unlocks the only locked field', async () => {
				await sandbox.createNode('Team', {
					code: teamCode,
					_lockedFields: `{"name":"v2-node-patch-client"}`,
				});
				await authenticatedPatch(
					`/v2/node/Team/${teamCode}?unlockFields=name`,
				).expect(
					200,
					sandbox.withMeta({
						code: teamCode,
					}),
				);
			});
		});
	});
});
