const app = require('../../server/app.js');
const API_KEY = process.env.API_KEY;
const {
	setupMocks,
	stubDbUnavailable,
	testNode,
	spyDbQuery,
	verifyNotExists
} = require('../helpers');

describe('v2 - node PATCH', () => {
	const sandbox = {};
	const namespace = 'v2-node-patch';

	const teamCode = `${namespace}-team`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;
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
			name: 'name1'
		});
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: 'name2'
		}).expect(
			200,
			sandbox.withUpdateMeta({
				name: 'name2',
				code: teamCode
			})
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				name: 'name2',
				code: teamCode
			})
		);

		sandbox.expectEvents(['UPDATE', teamCode, 'Team']);
	});

	it('Create when patching non-existent node', async () => {
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: 'name1'
		}).expect(
			201,
			sandbox.withCreateMeta({
				name: 'name1',
				code: teamCode
			})
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				name: 'name1',
				code: teamCode
			})
		);
		sandbox.expectEvents(['CREATE', teamCode, 'Team']);
	});

	it('error when conflicting code values', async () => {
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			code: 'wrong-code'
		}).expect(
			400,
			new RegExp(
				`Conflicting code property \`wrong-code\` in payload for Team ${teamCode}`
			)
		);
		verifyNotExists('Team', teamCode);
		sandbox.expectNoEvents();
	});

	it('not error when non-conflicting code values', async () => {
		await sandbox.createNode('Team', teamCode);
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: 'name1',
			code: teamCode
		}).expect(200);

		sandbox.expectEvents(['UPDATE', teamCode, 'Team']);
	});

	it('error when unrecognised attribute', async () => {
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			foo: 'unrecognised'
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
			name: 'name1'
		});
		await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
			name: null
		}).expect(
			200,
			sandbox.withUpdateMeta({
				code: teamCode
			})
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withUpdateMeta({
				code: teamCode
			})
		);
		sandbox.expectEvents(['UPDATE', teamCode, 'Team']);
	});

	it('no client-id header deletes the _updatedByClient metaProperty from the database', async () => {
		await sandbox.createNode('Team', {
			code: `${namespace}-team`,
			name: 'name1'
		});
		const expectedMeta = sandbox.withUpdateMeta({
			name: 'name2',
			code: teamCode
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
			name: 'name1'
		});
		const expectedMeta = sandbox.withUpdateMeta({
			name: 'name2',
			code: teamCode
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
					techLeads: null
				}).expect(
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/
				);
				sandbox.expectNoEvents();
			});

			it('errors if no relationshipAction query string when deleting individual relationship', async () => {
				await sandbox.createNode('Team', teamCode);
				await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
					'!techLeads': [personCode]
				}).expect(
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/
				);
				sandbox.expectNoEvents();
			});
			['merge', 'replace'].forEach(action =>
				describe(`with ${action} action`, () => {
					describe('individual relationship delete', () => {
						it('can delete a specific relationship', async () => {
							const [team, person1, person2] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`],
								['Person', `${personCode}-2`]
							);
							await sandbox.connectNodes(
								[team, 'HAS_TECH_LEAD', person1],
								[team, 'HAS_TECH_LEAD', person2]
							);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [`${personCode}-1`] }
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-2`]
								})
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({})
									},
									{
										type: 'Person',
										props: sandbox.withMeta({ code: `${personCode}-2` })
									}
								]
							);
							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team'],
								['UPDATE', `${personCode}-1`, 'Person']
							);
						});

						it("can attempt to delete a specific relationship of type that doesn't exist", async () => {
							await sandbox.createNode('Team', teamCode);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [personCode] }
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode
								})
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								})
							);
							sandbox.expectNoEvents();
						});

						it("can attempt to delete a specific relationship that doesn't exist", async () => {
							const [team, person1] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`]
							);
							await sandbox.connectNodes([team, 'HAS_TECH_LEAD', person1]);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [`${personCode}-2`] }
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-1`]
								})
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({})
									},
									{
										type: 'Person',
										props: sandbox.withMeta({ code: `${personCode}-1` })
									}
								]
							);
							sandbox.expectNoEvents();
						});

						it('can delete multiple specific relationships of the same kind', async () => {
							const [
								team,
								person1,
								person2,
								person3
							] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`],
								['Person', `${personCode}-2`],
								['Person', `${personCode}-3`]
							);
							await sandbox.connectNodes(
								[team, 'HAS_TECH_LEAD', person1],
								[team, 'HAS_TECH_LEAD', person2],
								[team, 'HAS_TECH_LEAD', person3]
							);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ '!techLeads': [`${personCode}-1`, `${personCode}-3`] }
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-2`]
								})
							);
							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({})
									},
									{
										type: 'Person',
										props: sandbox.withMeta({ code: `${personCode}-2` })
									}
								]
							);
							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team'],
								['UPDATE', `${personCode}-1`, 'Person'],
								['UPDATE', `${personCode}-3`, 'Person']
							);
						});

						it('can delete multiple specific relationships of different kinds', async () => {
							const [team, person, group] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', personCode],
								['Group', groupCode]
							);
							await sandbox.connectNodes(
								[team, 'HAS_TECH_LEAD', person],
								[group, 'HAS_TEAM', team]
							);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [personCode],
									'!parentGroup': groupCode
								}
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode
								})
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								})
							);
							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team'],
								['UPDATE', personCode, 'Person'],
								['UPDATE', groupCode, 'Group']
							);
						});
						it('leaves relationships in the opposite direction unaffected', async () => {
							const [team1, team2, team3] = await sandbox.createNodes(
								['Team', `${teamCode}-1`],
								['Team', `${teamCode}-2`],
								['Team', `${teamCode}-3`]
							);
							await sandbox.connectNodes(
								[team1, 'HAS_TEAM', team2],
								[team2, 'HAS_TEAM', team3]
							);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`,
								{ '!subTeams': [`${teamCode}-3`] }
							).expect(
								200,
								sandbox.withMeta({
									code: `${teamCode}-2`,
									parentTeam: `${teamCode}-1`
								})
							);

							await testNode(
								'Team',
								`${teamCode}-2`,
								sandbox.withMeta({
									code: `${teamCode}-2`
								}),
								[
									{
										type: 'HAS_TEAM',
										direction: 'incoming',
										props: sandbox.withMeta({})
									},
									{
										type: 'Team',
										props: sandbox.withMeta({ code: `${teamCode}-1` })
									}
								]
							);
							sandbox.expectEvents(
								['UPDATE', `${teamCode}-3`, 'Team'],
								['UPDATE', `${teamCode}-2`, 'Team']
							);
						});
						it('can add and remove relationships of the same type at the same time', async () => {
							const [team, person1] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', `${personCode}-1`],
								['Person', `${personCode}-2`]
							);
							await sandbox.connectNodes([team, 'HAS_TECH_LEAD', person1]);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									'!techLeads': [`${personCode}-1`],
									techLeads: [`${personCode}-2`]
								}
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [`${personCode}-2`]
								})
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({})
									},
									{
										type: 'Person',
										props: sandbox.withMeta({ code: `${personCode}-2` })
									}
								]
							);
							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team'],
								['UPDATE', `${personCode}-1`, 'Person'],
								['UPDATE', `${personCode}-2`, 'Person']
							);
						});
						it('errors if deleting and adding the same relationship to the same record', async () => {
							await sandbox.createNodes(
								['Team', teamCode],
								['Person', personCode]
							);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{
									techLeads: [personCode],
									'!techLeads': [personCode]
								}
							).expect(
								400,
								/Trying to add and remove a relationship to a record at the same time/
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								})
							);
							sandbox.expectNoEvents();
						});
					});
					describe('bulk relationship delete', () => {
						it('can delete empty relationship set', async () => {
							await sandbox.createNode('Team', teamCode);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ techLeads: null }
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode
								})
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								})
							);
							sandbox.expectNoEvents();
						});

						it('can delete entire relationship sets', async () => {
							const [team, person, group] = await sandbox.createNodes(
								['Team', teamCode],
								['Person', personCode],
								['Group', groupCode]
							);
							await sandbox.connectNodes(
								// tests incoming and outgoing relationships
								[group, 'HAS_TEAM', team],
								[team, 'HAS_TECH_LEAD', person]
							);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
								{ techLeads: null, parentGroup: null }
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode
								})
							);

							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								})
							);

							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team'],
								['UPDATE', personCode, 'Person'],
								['UPDATE', groupCode, 'Group']
							);
						});

						it('leaves relationships in other direction and of other types untouched when deleting', async () => {
							const [team1, team2, team3, person] = await sandbox.createNodes(
								['Team', `${teamCode}-1`],
								['Team', `${teamCode}-2`],
								['Team', `${teamCode}-3`],
								['Person', personCode]
							);
							await sandbox.connectNodes([team1, 'HAS_TEAM', team2]);
							await sandbox.connectNodes([team2, 'HAS_TEAM', team3]);
							await sandbox.connectNodes([team2, 'HAS_TECH_LEAD', person]);

							await authenticatedPatch(
								`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`,
								{
									subTeams: null
								}
							).expect(
								200,
								sandbox.withMeta({
									code: `${teamCode}-2`,
									parentTeam: `${teamCode}-1`,
									techLeads: [personCode]
								})
							);

							await testNode(
								'Team',
								`${teamCode}-2`,
								sandbox.withMeta({
									code: `${teamCode}-2`
								}),
								[
									{
										type: 'HAS_TEAM',
										direction: 'incoming',
										props: sandbox.withMeta({})
									},
									{
										type: 'Team',
										props: sandbox.withMeta({ code: `${teamCode}-1` })
									}
								],
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withMeta({})
									},
									{
										type: 'Person',
										props: sandbox.withMeta({ code: personCode })
									}
								]
							);

							sandbox.expectEvents(
								['UPDATE', `${teamCode}-2`, 'Team'],
								['UPDATE', `${teamCode}-3`, 'Team']
							);
						});
					});
				})
			);
		});
		describe('creating', () => {
			it('errors if updating relationships without relationshipAction query string', async () => {
				await sandbox.createNode('Team', teamCode);
				await authenticatedPatch(`/v2/node/Team/${teamCode}`, {
					techLeads: [personCode]
				}).expect(
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/
				);

				await testNode('Team', teamCode, sandbox.withMeta({ code: teamCode }));
				sandbox.expectNoEvents();
			});

			describe('__-to-one relationships', () => {
				['merge', 'replace'].forEach(action => {
					it('accept a string', async () => {
						await sandbox.createNodes(['Team', teamCode], ['Group', groupCode]);
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: groupCode
							}
						).expect(
							200,
							sandbox.withMeta({
								code: teamCode,
								parentGroup: groupCode
							})
						);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode
							}),
							[
								{
									type: 'HAS_TEAM',
									direction: 'incoming',
									props: sandbox.withCreateMeta({})
								},
								{
									type: 'Group',
									props: sandbox.withMeta({ code: groupCode })
								}
							]
						);

						sandbox.expectEvents(
							['UPDATE', teamCode, 'Team'],
							['UPDATE', groupCode, 'Group']
						);
					});
					it('accept an array of length one', async () => {
						await sandbox.createNodes(['Team', teamCode], ['Group', groupCode]);
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [groupCode]
							}
						).expect(
							200,
							sandbox.withMeta({
								code: teamCode,
								parentGroup: groupCode
							})
						);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode
							}),
							[
								{
									type: 'HAS_TEAM',
									direction: 'incoming',
									props: sandbox.withCreateMeta({})
								},
								{
									type: 'Group',
									props: sandbox.withMeta({ code: groupCode })
								}
							]
						);

						sandbox.expectEvents(
							['UPDATE', teamCode, 'Team'],
							['UPDATE', groupCode, 'Group']
						);
					});
					it('error if trying to write multiple relationships', async () => {
						await sandbox.createNodes(
							['Team', teamCode],
							['Group', `${groupCode}-1`],
							['Group', `${groupCode}-2`]
						);
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [`${groupCode}-1`, `${groupCode}-2`]
							}
						).expect(400, /Can only have one parentGroup/);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode
							})
						);

						sandbox.expectNoEvents();
					});

					it('replace existing relationship', async () => {
						const [team, group1] = await sandbox.createNodes(
							['Team', teamCode],
							['Group', `${groupCode}-1`],
							['Group', `${groupCode}-2`]
						);

						await sandbox.connectNodes(group1, 'HAS_TEAM', team);
						await authenticatedPatch(
							`/v2/node/Team/${teamCode}?relationshipAction=${action}`,
							{
								parentGroup: [`${groupCode}-2`]
							}
						).expect(
							200,
							sandbox.withMeta({
								code: teamCode,
								parentGroup: `${groupCode}-2`
							})
						);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode
							}),
							[
								{
									type: 'HAS_TEAM',
									direction: 'incoming',
									props: sandbox.withCreateMeta({})
								},
								{
									type: 'Group',
									props: sandbox.withMeta({ code: `${groupCode}-2` })
								}
							]
						);

						sandbox.expectEvents(
							['UPDATE', teamCode, 'Team'],
							['UPDATE', `${groupCode}-1`, 'Group'],
							['UPDATE', `${groupCode}-2`, 'Group']
						);
					});

					it.skip('not replace existing relationship in opposite direction', async () => {
						console.log(
							"schema doesn't support any one-to-one relationships in both directions, so not possible to test this yet"
						);
					});
				});
			});

			describe('merge', () => {
				it('can merge with empty relationship set if relationshipAction=merge', async () => {
					await sandbox.createNodes(['Team', teamCode], ['Person', personCode]);
					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=merge`,
						{
							techLeads: [personCode]
						}
					).expect(
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [personCode]
						})
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({})
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: personCode })
							}
						]
					);
					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team'],
						['UPDATE', personCode, 'Person']
					);
				});
				it('can merge with relationships if relationshipAction=merge', async () => {
					const [team, person1] = await sandbox.createNodes(
						['Team', teamCode],
						['Person', `${personCode}-1`],
						['Person', `${personCode}-2`]
					);
					await sandbox.connectNodes(team, ['HAS_TECH_LEAD'], person1);

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=merge`,
						{
							techLeads: [`${personCode}-2`]
						}
					).expect(
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [`${personCode}-2`, `${personCode}-1`]
						})
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withMeta({})
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: `${personCode}-1` })
							}
						],
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({})
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: `${personCode}-2` })
							}
						]
					);
					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team'],
						['UPDATE', `${personCode}-2`, 'Person']
					);
				});
			});

			describe('replace', () => {
				it('can replace an empty relationship set if relationshipAction=replace', async () => {
					await sandbox.createNodes(['Team', teamCode], ['Person', personCode]);
					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=replace`,
						{
							techLeads: [personCode]
						}
					).expect(
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [personCode]
						})
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({})
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: personCode })
							}
						]
					);

					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team'],
						['UPDATE', personCode, 'Person']
					);
				});

				it('can replace relationships if relationshipAction=replace', async () => {
					const [team, person1] = await sandbox.createNodes(
						['Team', teamCode],
						['Person', `${personCode}-1`],
						['Person', `${personCode}-2`]
					);
					await sandbox.connectNodes(team, ['HAS_TECH_LEAD'], person1);

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}?relationshipAction=replace`,
						{
							techLeads: [`${personCode}-2`]
						}
					).expect(
						200,
						sandbox.withMeta({
							code: teamCode,
							techLeads: [`${personCode}-2`]
						})
					);

					await testNode(
						'Team',
						teamCode,
						sandbox.withMeta({
							code: teamCode
						}),
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({})
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: `${personCode}-2` })
							}
						]
					);
					sandbox.expectEvents(
						['UPDATE', teamCode, 'Team'],
						['UPDATE', `${personCode}-1`, 'Person'],
						['UPDATE', `${personCode}-2`, 'Person']
					);
				});

				it('leaves relationships in other direction and of other types untouched when replacing', async () => {
					const [team1, team2, , person] = await sandbox.createNodes(
						['Team', `${teamCode}-1`],
						['Team', `${teamCode}-2`],
						['Team', `${teamCode}-3`],
						['Person', personCode]
					);
					await sandbox.connectNodes([team1, 'HAS_TEAM', team2]);
					await sandbox.connectNodes([team2, 'HAS_TECH_LEAD', person]);

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}-2?relationshipAction=replace`,
						{
							subTeams: [`${teamCode}-3`]
						}
					).expect(
						200,
						sandbox.withMeta({
							code: `${teamCode}-2`,
							subTeams: [`${teamCode}-3`],
							parentTeam: `${teamCode}-1`,
							techLeads: [personCode]
						})
					);

					await testNode(
						'Team',
						`${teamCode}-2`,
						sandbox.withMeta({
							code: `${teamCode}-2`
						}),
						[
							{
								type: 'HAS_TEAM',
								direction: 'incoming',
								props: sandbox.withMeta({})
							},
							{
								type: 'Team',
								props: sandbox.withMeta({ code: `${teamCode}-1` })
							}
						],
						[
							{
								type: 'HAS_TEAM',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({})
							},
							{
								type: 'Team',
								props: sandbox.withMeta({ code: `${teamCode}-3` })
							}
						],
						[
							{
								type: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								props: sandbox.withMeta({})
							},
							{
								type: 'Person',
								props: sandbox.withMeta({ code: personCode })
							}
						]
					);

					sandbox.expectEvents(
						['UPDATE', `${teamCode}-2`, 'Team'],
						['UPDATE', `${teamCode}-3`, 'Team']
					);
				});

				it('replaces relationships in multiple directions', async () => {
					const [team1, team2, team3] = await sandbox.createNodes(
						['Team', `${teamCode}-1`],
						['Team', `${teamCode}-2`],
						['Team', `${teamCode}-3`]
					);
					await sandbox.connectNodes([team1, 'HAS_TEAM', team2]);
					await sandbox.connectNodes([team2, 'HAS_TEAM', team3]);

					await authenticatedPatch(
						`/v2/node/Team/${teamCode}-2?relationshipAction=replace`,
						{
							subTeams: [`${teamCode}-1`],
							parentTeam: `${teamCode}-3`
						}
					).expect(
						200,
						sandbox.withMeta({
							code: `${teamCode}-2`,
							subTeams: [`${teamCode}-1`],
							parentTeam: `${teamCode}-3`
						})
					);

					await testNode(
						'Team',
						`${teamCode}-2`,
						sandbox.withMeta({
							code: `${teamCode}-2`
						}),
						[
							{
								type: 'HAS_TEAM',
								direction: 'incoming',
								props: sandbox.withCreateMeta({})
							},
							{
								type: 'Team',
								props: sandbox.withMeta({ code: `${teamCode}-3` })
							}
						],
						[
							{
								type: 'HAS_TEAM',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({})
							},
							{
								type: 'Team',
								props: sandbox.withMeta({ code: `${teamCode}-1` })
							}
						]
					);
					sandbox.expectEvents(
						['UPDATE', `${teamCode}-1`, 'Team'],
						['UPDATE', `${teamCode}-2`, 'Team'],
						['UPDATE', `${teamCode}-3`, 'Team']
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
									techLeads: [personCode]
								}
							).expect(400, /Missing related node/);
							sandbox.expectNoEvents();
						});

						it('create node related to non-existent nodes when using upsert=true', async () => {
							await sandbox.createNode('Team', teamCode);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`,
								{
									techLeads: [personCode]
								}
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [personCode]
								})
							);
							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({})
									},
									{
										type: 'Person',
										props: sandbox.withCreateMeta({ code: personCode })
									}
								]
							);

							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team'],
								['CREATE', personCode, 'Person']
							);
						});

						it('not leave creation artifacts on things that already existed when using `upsert=true`', async () => {
							await sandbox.createNode('Team', teamCode);
							await sandbox.createNode('Person', personCode);
							await authenticatedPatch(
								`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`,
								{
									techLeads: [personCode]
								}
							).expect(
								200,
								sandbox.withMeta({
									code: teamCode,
									techLeads: [personCode]
								})
							);
							await testNode(
								'Team',
								teamCode,
								sandbox.withMeta({
									code: teamCode
								}),
								[
									{
										type: 'HAS_TECH_LEAD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({})
									},
									{
										type: 'Person',
										props: sandbox.withMeta({ code: personCode })
									}
								]
							);

							sandbox.expectEvents(
								['UPDATE', teamCode, 'Team'],
								['UPDATE', personCode, 'Person']
							);
						});
					});
				});
			});
		});
	});

	describe('diffing before writes', () => {
		it("doesn't write if no real property changes detected", async () => {
			await sandbox.createNode('Team', { code: teamCode, name: 'name-1' });
			const dbQuerySpy = spyDbQuery(sandbox);
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
				{
					name: 'name-1'
				}
			).expect(200);

			dbQuerySpy().args.forEach(args => {
				expect(args[0]).not.toMatch(/MERGE|CREATE/);
			});
			sandbox.expectNoEvents();
		});

		it("doesn't write if no real relationship changes detected in replace mode", async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
				{ techLeads: [personCode] }
			).expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				false
			);
			sandbox.expectNoEvents();
		});

		it("doesn't write if no real relationship changes detected in merge mode", async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ techLeads: [personCode] }
			).expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				false
			);
			sandbox.expectNoEvents();
		});

		it('writes if property but no relationship changes detected', async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: 'new-name', techLeads: [personCode] }
			).expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				true
			);
			sandbox.expectEvents(['UPDATE', teamCode, 'Team']);
		});

		it('writes if relationship but no property changes detected', async () => {
			const [team, person] = await sandbox.createNodes(
				['Team', { code: teamCode, name: 'name' }],
				['Person', `${personCode}-1`],
				['Person', `${personCode}-2`]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			const dbQuerySpy = spyDbQuery(sandbox);
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: 'name', techLeads: [`${personCode}-2`] }
			).expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				true
			);
			sandbox.expectEvents(
				['UPDATE', teamCode, 'Team'],
				['UPDATE', `${personCode}-2`, 'Person']
			);
		});

		it('detects deleted property as a change', async () => {
			await sandbox.createNode('Team', { code: teamCode, name: 'name' });
			const dbQuerySpy = spyDbQuery(sandbox);
			await authenticatedPatch(
				`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
				{ name: null }
			).expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				true
			);
			sandbox.expectEvents(['UPDATE', teamCode, 'Team']);
		});

		describe('patching with fewer relationships', () => {
			it('treats fewer relationships as a delete when replacing relationships', async () => {
				const [team, person1, person2] = await sandbox.createNodes(
					['Team', teamCode],
					['Person', `${personCode}-1`],
					['Person', `${personCode}-2`]
				);
				await sandbox.connectNodes(
					[team, 'HAS_TECH_LEAD', person1],
					[team, 'HAS_TECH_LEAD', person2]
				);
				const dbQuerySpy = spyDbQuery(sandbox);
				await authenticatedPatch(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`,
					{
						techLeads: [`${personCode}-1`]
					}
				).expect(200);

				expect(
					dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))
				).toBe(true);
				sandbox.expectEvents(
					['UPDATE', teamCode, 'Team'],
					['UPDATE', `${personCode}-2`, 'Person']
				);
			});

			it('treats fewer relationships as no change when merging relationships', async () => {
				const [team, person1, person2] = await sandbox.createNodes(
					['Team', teamCode],
					['Person', `${personCode}-1`],
					['Person', `${personCode}-2`]
				);
				await sandbox.connectNodes(
					[team, 'HAS_TECH_LEAD', person1],
					[team, 'HAS_TECH_LEAD', person2]
				);
				const dbQuerySpy = spyDbQuery(sandbox);
				await authenticatedPatch(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`,
					{
						techLeads: [`${personCode}-1`]
					}
				).expect(200);

				expect(
					dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))
				).toBe(false);
				sandbox.expectNoEvents();
			});
		});
	});
});
