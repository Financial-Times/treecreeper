const surveys = [
	{version: 0, id: 'abc', title: 'Anti-Bribery and Corruption'},
	{version: 0, id: 'as', title: 'Anti Slavery'},
	{version: 0, id: 'bcm', title: 'Business Continuity Management'},
	{version: 0, id: 'dp', title: 'Data Protection'},
	{version: 0, id: 'pci', title: 'PCI Compliance'},
	{version: 0, id: 'ra', title: 'Risk Assessment'},
	{version: 0, id: 'sla', title: 'Service Level Agreement'},
	{version: 0, id: 'tdd', title: 'Technical Due Diligence'}
];

const createSurveys = async (db) => {
	for (let survey of surveys) {
		await db.run('CREATE (a:Survey {version: $version, id: $id, title: $title}) RETURN a', survey);
		createQuestions(db, survey.id);
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
				: `''`;

			createQuestion(db, question);
			await db.run(`
				MATCH (a:Survey),(b:SurveyQuestion)
				WHERE a.id = '${surveyId}'
				AND b.id = '${question._id}'
				CREATE (a)-[r:ASKS {section: ${sectionTitle}}]->(b)
				RETURN r
			`);

			if (question.child_questions) {
				for (let child of question.child_questions) {
					createQuestion(db, child);
					await db.run(`
						MATCH (a:SurveyQuestion),(b:SurveyQuestion)
						WHERE a.id = '${question._id}'
						AND b.id = '${child._id}'
						CREATE (a)-[r:RAISES {trigger: '${child.child_question_trigger}'}]->(b)
						RETURN r
					`);

					if (child.fieldOptions) {
						fieldOptions(db, child);
					}
				}
			}

			if (question.fieldOptions) {
				fieldOptions(db, question);
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

