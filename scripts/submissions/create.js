const submissions = [{
	id: 'danger1tdd',
	contractId: 'danger1',
	surveyId: 'tdd',
	answers: [{
		questionId: 'tdd_org_1',
		text: '1-100'// TODO add multi choice / radio / select as separate nodes?
	},{
		questionId: 'tdd_org_2',
		text: 'Lorem ipsum dolor sit does that answer your question'
	}]
},{
	id: 'danger1abc',
	contractId: 'danger1',
	surveyId: 'abc',
	answers: [{
		questionId: 'abc_1232',
		text: 'no'// TODO add multi choice / radio / select as separate nodes?
	}]
}];

const createSubmissions = async (db) => {
	for (let submission of submissions) {
		const s = await db.run('CREATE (a:Submission {id: $id}) RETURN a', submission);
		console.log('\n\nsubmission', s.records.length);
		const x = await db.run(`
			MATCH (a:Contract),(b:Submission)
			WHERE a.id = '${submission.contractId}'
			AND b.id = '${submission.id}'
			CREATE (a)-[r:SUBMITS]->(b)
			RETURN r`);
		console.log('submits', JSON.stringify(x, null, 2));
		await db.run(`
			MATCH (a:Submission),(b:Survey)
			WHERE a.id = '${submission.id}'
			AND b.id = '${submission.surveyId}'
			CREATE (a)-[r:ANSWERS]->(b)
			RETURN r
		`);

		for (let answer of submission.answers) {
			console.log('answer');
			console.log(answer);

			await db.run('CREATE (a:SubmissionAnswer {questionId: $questionId, text: $text}) RETURN a', answer);
			await db.run(`
				MATCH (a:Submission),(b:SubmissionAnswer)
				WHERE a.id = '${submission.id}'
				AND b.questionId = '${answer.questionId}'
				CREATE (a)-[r:HAS]->(b)
				RETURN r
			`);
			await db.run(`
				MATCH (a:SubmissionAnswer),(b:SurveyQuestion)
				WHERE a.questionId = '${answer.questionId}'
				AND b.id = '${answer.questionId}'
				CREATE (a)-[r:ANSWERS_QUESTION]->(b)
				RETURN r
			`);
		}
	}
};

module.exports = createSubmissions;

