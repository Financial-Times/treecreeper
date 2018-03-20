const surveys = [
	{version: 0, id: 'abc', title: 'Anti-Bribery and Corruption'},
	{version: 0, id: 'as', title: 'Anti-Slavery'},
	{version: 0, id: 'bcm', title: 'Business Continuity Management'},
	{version: 0, id: 'dp', title: 'Data Protection'},
	{version: 0, id: 'pci', title: 'PCI Compliance'},
	{version: 0, id: 'ra', title: 'Risk Assessment'},
	{version: 0, id: 'sla', title: 'Service Level Agreement'},
	{version: 0, id: 'tdd', title: 'Technical Due Diligence'},
	{version: 0, id: 'company-info', title: 'Company Info', type: 'topLevel'},
];

const createSurveys = async (db) => {

	for (let survey of surveys) {

		console.log('\nCREATING SURVEY', survey);

		let type = '';

		if (survey.type) {
			type = ', type: $type';
		}

		const createQuery = `CREATE (a:Survey {version: $version, id: $id, title: $title${type}}) RETURN a`;

		await db.run(createQuery, survey);
		await createQuestions(db, survey.id);
	}
};

const createQuestion = async (db, question) => {
	const query =`
		CREATE (a:SurveyQuestion {
					id: $_id,
					text: $question
					${question.prompt ? ', prompt: $prompt' : ''}
					${question.fieldType ? ', fieldType: $fieldType' : ''}
				})
		RETURN a
	`;

	await db.run(query, question);
};

const createQuestions = async (db, surveyId) => {

	const sections = require(`./${surveyId}.json`).section;

	for (let section of sections) {
		const questions = section.form;

		for (let question of questions) {
			const sectionTitle = section.title
				? `'${section.title}'`
				: '\'\'';

			await createQuestion(db, question);
			await db.run(`
				MATCH (a:Survey),(b:SurveyQuestion)
				WHERE a.id = '${surveyId}'
				AND b.id = '${question._id}'
				CREATE (a)-[r:ASKS {section: ${sectionTitle}}]->(b)
				RETURN r
			`);

			if (question.child_questions) {
				for (let child of question.child_questions) {
					await createQuestion(db, child);
					await db.run(`
						MATCH (a:SurveyQuestion),(b:SurveyQuestion)
						WHERE a.id = '${question._id}'
						AND b.id = '${child._id}'
						CREATE (a)-[r:RAISES {trigger: '${child.child_question_trigger}'}]->(b)
						RETURN r
					`);

					if (child.fieldOptions) {
						await fieldOptions(db, child);
					}

					if (child.child_questions) {
						for (let granchild of child.child_questions) {
							await createQuestion(db, granchild);
							await db.run(`
								MATCH (a:SurveyQuestion),(b:SurveyQuestion)
								WHERE a.id = '${child._id}'
								AND b.id = '${granchild._id}'
								CREATE (a)-[r:RAISES {trigger: '${granchild.child_question_trigger}'}]->(b)
								RETURN r
							`);

							if (granchild.fieldOptions) {
								await fieldOptions(db, granchild);
							}
						}
					}

				}
			}

			if (question.fieldOptions) {
				await fieldOptions(db, question);
			}

		}
	}
};

const fieldOptions = async (db, question) => {
	for (let option of question.fieldOptions) {
		await db.run(`CREATE (a:SurveyQuestionOption {text: '${option}', id: '${question._id+option}'}) RETURN a`);
		await db.run(`
			MATCH (a:SurveyQuestion),(b:SurveyQuestionOption)
			WHERE a.id = '${question._id}'
			AND b.id = '${question._id+option}'
			CREATE (a)-[r:ALLOWS]->(b)
			RETURN r
		`);
	}
};

module.exports = createSurveys;

