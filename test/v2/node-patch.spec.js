const app = require('../../server/app.js');
const {
	setupMocks,
	stubDbUnavailable,
	testNode,
	spyDbQuery,
	verifyNotExists
} = require('./helpers');
const queryBatchingTests = require('./test-bundles/query-batching');

describe('v2 - node PATCH', () => {
	const sandbox = {};
	const namespace = 'v2-node-patch';

	const teamCode = `${namespace}-team`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;
	const requestId = `${namespace}-request`;
	const clientId = `${namespace}-client`;

	const event = (action, code, type) => ({
		action,
		type,
		code,
		requestId,
		clientId
	});

	setupMocks(sandbox, { namespace });

	it('update node', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1'
		});
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({
				name: 'name2'
			})
			.expect(
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

		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
			event('UPDATE', teamCode, 'Team')
		);
	});

	it('Create when patching non-existent node', async () => {
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({
				name: 'name1'
			})
			.expect(
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
		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
			event('CREATE', teamCode, 'Team')
		);
	});

	it('error when conflicting code values', async () => {
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ code: 'wrong-code' })
			.expect(
				400,
				new RegExp(
					`Conflicting code attribute \`wrong-code\` for Team ${teamCode}`
				)
			);
		verifyNotExists('Team', teamCode);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
	});

	it('not error when non-conflicting code values', async () => {
		await sandbox.createNode('Team', teamCode);
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ name: 'name1', code: teamCode })
			.expect(200);
		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
			event('UPDATE', teamCode, 'Team')
		);
	});

	it('error when unrecognised attribute', async () => {
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ foo: 'unrecognised' })
			.expect(400, /Invalid property `foo` on type `Team`/);
		verifyNotExists('Team', teamCode);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({})
			.expect(500);
		// verifyNotExists('Team', teamCode);
		// expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
	});

	it("deletes attributes which are provided as 'null'", async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1'
		});
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ name: null })
			.expect(
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
		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
			event('UPDATE', teamCode, 'Team')
		);
	});

	describe('relationship patching', () => {
		describe('deleting', () => {
			it('errors if no relationshipAction query string when deleting relationship set', async () => {
				await sandbox.createNode('Team', teamCode);
				await sandbox
					.request(app)
					.patch(`/v2/node/Team/${teamCode}`)
					.namespacedAuth()
					.send({ techLeads: null })
					.expect(
						400,
						/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/
					);
				expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			});

			it.skip('errors if no relationshipAction query string when deleting individual relationship', async () => {
				await sandbox.createNode('Team', teamCode);
				await sandbox
					.request(app)
					.patch(`/v2/node/Team/${teamCode}`)
					.namespacedAuth()
					.send({ '!techLeads': [personCode] })
					.expect(
						400,
						/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/
					);
				expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			});
			['merge', 'replace'].forEach(action =>
				describe(`with ${action} action`, () => {
					describe('individual relationship delete', () => {
						it.skip('can delete a specific relationship', async () => {});
						it.skip('can delete multiple specific relationships of the same kind', async () => {});
						it.skip('can delete multiple specific relationships of different kinds', async () => {});
						it.skip('leaves relationships in the opposite direction unaffected', async () => {});
						it.skip('can add and remove relationships of the same type at the same time', async () => {});
						it.skip('errors if deleting and adding the same relationship to the same record', async () => {});
					});
					describe('bulk relationship delete', () => {
						it('can delete empty relationship set', async () => {
							await sandbox.createNode('Team', teamCode);
							await sandbox
								.request(app)
								.patch(`/v2/node/Team/${teamCode}?relationshipAction=${action}`)
								.namespacedAuth()
								.send({ techLeads: null })
								.expect(
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

							expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
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
							await sandbox
								.request(app)
								.patch(`/v2/node/Team/${teamCode}?relationshipAction=${action}`)
								.namespacedAuth()
								.send({ techLeads: null, parentGroup: null })
								.expect(
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

							expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', teamCode, 'Team')
							);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', personCode, 'Person')
							);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', groupCode, 'Group')
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

							await sandbox
								.request(app)
								.patch(
									`/v2/node/Team/${teamCode}-2?relationshipAction=${action}`
								)
								.namespacedAuth()
								.send({
									subTeams: null
								})
								.expect(
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

							expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', `${teamCode}-2`, 'Team')
							);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', `${teamCode}-3`, 'Team')
							);
						});
					});
				})
			);
		});
		describe('creating', () => {
			it('errors if updating relationships without relationshipAction query string', async () => {
				await sandbox.createNode('Team', teamCode);
				await sandbox
					.request(app)
					.patch(`/v2/node/Team/${teamCode}`)
					.namespacedAuth()
					.send({ techLeads: [personCode] })
					.expect(
						400,
						/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/
					);

				await testNode('Team', teamCode, sandbox.withMeta({ code: teamCode }));
				expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			});

			describe('__-to-one relationships', () => {
				['merge', 'replace'].forEach(action => {
					it('accept a string', async () => {
						await sandbox.createNodes(['Team', teamCode], ['Group', groupCode]);
						await sandbox
							.request(app)
							.patch(`/v2/node/Team/${teamCode}?relationshipAction=${action}`)
							.namespacedAuth()
							.send({ parentGroup: groupCode })
							.expect(
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

						expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
						expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
							event('UPDATE', teamCode, 'Team')
						);
						expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
							event('UPDATE', groupCode, 'Group')
						);
					});
					it('accept an array of length one', async () => {
						await sandbox.createNodes(['Team', teamCode], ['Group', groupCode]);
						await sandbox
							.request(app)
							.patch(`/v2/node/Team/${teamCode}?relationshipAction=${action}`)
							.namespacedAuth()
							.send({ parentGroup: [groupCode] })
							.expect(
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

						expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
						expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
							event('UPDATE', teamCode, 'Team')
						);
						expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
							event('UPDATE', groupCode, 'Group')
						);
					});
					it('error if trying to write multiple relationships', async () => {
						await sandbox.createNodes(
							['Team', teamCode],
							['Group', `${groupCode}-1`],
							['Group', `${groupCode}-2`]
						);
						await sandbox
							.request(app)
							.patch(`/v2/node/Team/${teamCode}?relationshipAction=${action}`)
							.namespacedAuth()
							.send({ parentGroup: [`${groupCode}-1`, `${groupCode}-2`] })
							.expect(400, /Can only have one parentGroup/);

						await testNode(
							'Team',
							teamCode,
							sandbox.withMeta({
								code: teamCode
							})
						);

						expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
					});

					it('replace existing relationship', async () => {
						const [team, group1] = await sandbox.createNodes(
							['Team', teamCode],
							['Group', `${groupCode}-1`],
							['Group', `${groupCode}-2`]
						);

						await sandbox.connectNodes(group1, 'HAS_TEAM', team);
						await sandbox
							.request(app)
							.patch(`/v2/node/Team/${teamCode}?relationshipAction=${action}`)
							.namespacedAuth()
							.send({ parentGroup: [`${groupCode}-2`] })
							.expect(
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

						expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
						expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
							event('UPDATE', teamCode, 'Team')
						);
						expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
							event('UPDATE', `${groupCode}-1`, 'Group')
						);
						expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
							event('UPDATE', `${groupCode}-2`, 'Group')
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
					await sandbox
						.request(app)
						.patch(`/v2/node/Team/${teamCode}?relationshipAction=merge`)
						.namespacedAuth()
						.send({
							techLeads: [personCode]
						})
						.expect(
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
					expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', teamCode, 'Team')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', personCode, 'Person')
					);
				});
				it('can merge with relationships if relationshipAction=merge', async () => {
					const [team, person1] = await sandbox.createNodes(
						['Team', teamCode],
						['Person', `${personCode}-1`],
						['Person', `${personCode}-2`]
					);
					await sandbox.connectNodes(team, ['HAS_TECH_LEAD'], person1);

					await sandbox
						.request(app)
						.patch(`/v2/node/Team/${teamCode}?relationshipAction=merge`)
						.namespacedAuth()
						.send({
							techLeads: [`${personCode}-2`]
						})
						.expect(
							200,
							sandbox.withMeta({
								code: teamCode,
								techLeads: [`${personCode}-1`, `${personCode}-2`]
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
					expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', teamCode, 'Team')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${personCode}-2`, 'Person')
					);
				});
			});

			describe('replace', () => {
				it('can replace an empty relationship set if relationshipAction=replace', async () => {
					await sandbox.createNodes(['Team', teamCode], ['Person', personCode]);
					await sandbox
						.request(app)
						.patch(`/v2/node/Team/${teamCode}?relationshipAction=replace`)
						.namespacedAuth()
						.send({
							techLeads: [personCode]
						})
						.expect(
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

					expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', teamCode, 'Team')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', personCode, 'Person')
					);
				});

				it('can replace relationships if relationshipAction=replace', async () => {
					const [team, person1] = await sandbox.createNodes(
						['Team', teamCode],
						['Person', `${personCode}-1`],
						['Person', `${personCode}-2`]
					);
					await sandbox.connectNodes(team, ['HAS_TECH_LEAD'], person1);

					await sandbox
						.request(app)
						.patch(`/v2/node/Team/${teamCode}?relationshipAction=replace`)
						.namespacedAuth()
						.send({
							techLeads: [`${personCode}-2`]
						})
						.expect(
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
					expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', teamCode, 'Team')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${personCode}-1`, 'Person')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${personCode}-2`, 'Person')
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

					await sandbox
						.request(app)
						.patch(`/v2/node/Team/${teamCode}-2?relationshipAction=replace`)
						.namespacedAuth()
						.send({
							subTeams: [`${teamCode}-3`]
						})
						.expect(
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

					expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${teamCode}-2`, 'Team')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${teamCode}-3`, 'Team')
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

					await sandbox
						.request(app)
						.patch(`/v2/node/Team/${teamCode}-2?relationshipAction=replace`)
						.namespacedAuth()
						.send({
							subTeams: [`${teamCode}-1`],
							parentTeam: `${teamCode}-3`
						})
						.expect(
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
					expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${teamCode}-1`, 'Team')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${teamCode}-2`, 'Team')
					);
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
						event('UPDATE', `${teamCode}-3`, 'Team')
					);
				});
			});

			describe('upsert', () => {
				['merge', 'replace'].forEach(action => {
					describe(`with ${action}`, () => {
						it(`error when relationship to non-existent node`, async () => {
							await sandbox
								.request(app)
								.patch(`/v2/node/Team/${teamCode}?relationshipAction=${action}`)
								.namespacedAuth()
								.send({
									techLeads: [personCode]
								})
								.expect(400, /Missing related node/);
							expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
						});

						it('create node related to non-existent nodes when using upsert=true', async () => {
							await sandbox.createNode('Team', teamCode);
							await sandbox
								.request(app)
								.patch(
									`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`
								)
								.namespacedAuth()
								.send({
									techLeads: [personCode]
								})
								.expect(
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

							expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', teamCode, 'Team')
							);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('CREATE', personCode, 'Person')
							);
						});

						it('not leave creation artefacts on things that already existed when using `upsert=true`', async () => {
							await sandbox.createNode('Team', teamCode);
							await sandbox.createNode('Person', personCode);
							await sandbox
								.request(app)
								.patch(
									`/v2/node/Team/${teamCode}?relationshipAction=${action}&upsert=true`
								)
								.namespacedAuth()
								.send({
									techLeads: [personCode]
								})
								.expect(
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

							expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', teamCode, 'Team')
							);
							expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
								event('UPDATE', personCode, 'Person')
							);
						});
					});
				});
			});
		});
	});

	queryBatchingTests({
		method: 'patch',
		url: `/v2/node/System/${namespace}-system?upsert=true&relationshipAction=merge`,
		namespace,
		sandbox,
		app
	});

	describe('diffing before writes', () => {
		it("doesn't write if no real property changes detected", async () => {
			const dbQuerySpy = spyDbQuery(sandbox);
			await sandbox.createNode('Team', { code: teamCode, name: 'name-1' });
			await sandbox
				.request(app)
				.patch(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`
				)
				.namespacedAuth()
				.send({
					name: 'name-1'
				})
				.expect(200);

			dbQuerySpy().args.forEach(args => {
				expect(args[0]).not.toMatch(/MERGE|CREATE/);
			});
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});

		it("doesn't write if no real relationship changes detected in replace mode", async () => {
			const dbQuerySpy = spyDbQuery(sandbox);
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			await sandbox
				.request(app)
				.patch(
					`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`
				)
				.namespacedAuth()
				.send({ techLeads: [personCode] })
				.expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				false
			);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});

		it("doesn't write if no real relationship changes detected in merge mode", async () => {
			const dbQuerySpy = spyDbQuery(sandbox);
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			await sandbox
				.request(app)
				.patch(`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`)
				.namespacedAuth()
				.send({ techLeads: [personCode] })
				.expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				false
			);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});

		it('writes if property but no relationship changes detected', async () => {
			const dbQuerySpy = spyDbQuery(sandbox);
			const [team, person] = await sandbox.createNodes(
				['Team', teamCode],
				['Person', personCode]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			await sandbox
				.request(app)
				.patch(`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`)
				.namespacedAuth()
				.send({ name: 'new-name', techLeads: [personCode] })
				.expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				true
			);
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
				event('UPDATE', teamCode, 'Team')
			);
		});

		it('writes if relationship but no property changes detected', async () => {
			const dbQuerySpy = spyDbQuery(sandbox);
			const [team, person] = await sandbox.createNodes(
				['Team', { code: teamCode, name: 'name' }],
				['Person', `${personCode}-1`],
				['Person', `${personCode}-2`]
			);
			await sandbox.connectNodes(team, 'HAS_TECH_LEAD', person);
			await sandbox
				.request(app)
				.patch(`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`)
				.namespacedAuth()
				.send({ name: 'name', techLeads: [`${personCode}-2`] })
				.expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				true
			);
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
				event('UPDATE', teamCode, 'Team')
			);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
				event('UPDATE', `${personCode}-2`, 'Person')
			);
		});

		it('detects deleted property as a change', async () => {
			const dbQuerySpy = spyDbQuery(sandbox);
			await sandbox.createNode('Team', { code: teamCode, name: 'name' });
			await sandbox
				.request(app)
				.patch(`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`)
				.namespacedAuth()
				.send({ name: null })
				.expect(200);

			expect(dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))).toBe(
				true
			);
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
				event('UPDATE', teamCode, 'Team')
			);
		});

		describe('patching with fewer relationships', () => {
			it('treats fewer relationships as a delete when replacing relationships', async () => {
				const dbQuerySpy = spyDbQuery(sandbox);
				const [team, person1, person2] = await sandbox.createNodes(
					['Team', teamCode],
					['Person', `${personCode}-1`],
					['Person', `${personCode}-2`]
				);
				await sandbox.connectNodes(
					[team, 'HAS_TECH_LEAD', person1],
					[team, 'HAS_TECH_LEAD', person2]
				);
				await sandbox
					.request(app)
					.patch(
						`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=replace`
					)
					.namespacedAuth()
					.send({
						techLeads: [`${personCode}-1`]
					})
					.expect(200);

				expect(
					dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))
				).toBe(true);
				expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
				expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
					event('UPDATE', teamCode, 'Team')
				);
				expect(sandbox.stubSendEvent).toHaveBeenCalledWith(
					event('UPDATE', `${personCode}-2`, 'Person')
				);
			});

			it('treats fewer relationships as no change when merging relationships', async () => {
				const dbQuerySpy = spyDbQuery(sandbox);
				const [team, person1, person2] = await sandbox.createNodes(
					['Team', teamCode],
					['Person', `${personCode}-1`],
					['Person', `${personCode}-2`]
				);
				await sandbox.connectNodes(
					[team, 'HAS_TECH_LEAD', person1],
					[team, 'HAS_TECH_LEAD', person2]
				);
				await sandbox
					.request(app)
					.patch(
						`/v2/node/Team/${teamCode}?upsert=true&relationshipAction=merge`
					)
					.namespacedAuth()
					.send({
						techLeads: [`${personCode}-1`]
					})
					.expect(200);
				expect(
					dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0]))
				).toBe(false);
				expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			});
		});
	});
});
