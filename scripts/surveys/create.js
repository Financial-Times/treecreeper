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
		console.log('trying to create survey', survey);
		await db.run('CREATE (a:survey {version: $version, id: $id, title: $title}) RETURN a', survey);
		createQuestions(db, survey.id);
	}
};

const createQuestions = async (db, surveyId) => {

	const sections = require(`./${surveyId}.json`).section;

	for (let section of sections) {
		const questions = section.form;

		for (let question of questions) {
			await db.run(`CREATE (a:survey_question {id: $_id, text: $question${question.fieldType ? ', fieldType: $fieldType' : ''}}) RETURN a`, question);
			const result = await db.run(`
				MATCH (a:survey),(b:survey_question)
				WHERE a.id = '${surveyId}'
				AND b.id = '${question._id}'
				CREATE (a)-[r:ASKS {section: '${section.title}'}]->(b)
				RETURN r
			`);
			console.log(surveyId, question._id, result.records.length);

		}
	}
};

module.exports = createSurveys;

