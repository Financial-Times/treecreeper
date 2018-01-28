const crud = require('./_crud');
const db = require('../db-connection');

const get = async (req, res) => {
	console.log('GETTING')
	try {
		const query = `MATCH p=(a:Survey {id:'${req.params.id}'})-[:ASKS]->(b:SurveyQuestion)-[:ALLOWS|:RAISES*0..]->() RETURN p ORDER BY b.id`;

		console.log(query);

		const result = await db.run(query);

		const surveyObj = {
			questions: {}
		};

		if (result.records.length) {
			const sections = [];

			for (const record of result.records) {

				for (const field of record._fields) {

					for (const segment of field.segments) {

						if (segment.relationship.type ==='ASKS') {
							const sectionName = segment.relationship.properties.section;
							const questionAsEnd = segment.end.properties;
							questionAsEnd.section = sectionName;

							if (!sections.includes(sectionName)) {
								sections.push(sectionName);
							}

							if (!surveyObj.questions[questionAsEnd.id]) {
								surveyObj.questions[questionAsEnd.id] = questionAsEnd;
							}
						}
						else if (segment.relationship.type === 'ALLOWS') {
							const questionAsStart = segment.start.properties;
							const option = segment.end.properties;

							if (surveyObj.questions[questionAsStart.id]) {
								if (!surveyObj.questions[questionAsStart.id].options){
									surveyObj.questions[questionAsStart.id].options = [];
								}
								surveyObj.questions[questionAsStart.id].options.push(option);
							}
							else {
								for (const question in surveyObj.questions) {
									if (surveyObj.questions[question].childQuestions) {
										for (const key in surveyObj.questions[question].childQuestions) {
											if (questionAsStart.id === surveyObj.questions[question].childQuestions[key].id) {
												if (surveyObj.questions[question].childQuestions[key].options) {
													surveyObj.questions[question].childQuestions[key].options.push(option);
												}
												else {
													surveyObj.questions[question].childQuestions[key].options = [option];
												}
											}
										}
									}
								}
							}
						}
						else if (segment.relationship.type === 'RAISES') {

							const parentQuestion = segment.start.properties;
							const childQuestion = segment.end.properties;
							childQuestion.parent = parentQuestion.id;
							childQuestion.trigger = segment.relationship.properties.trigger;


							if (surveyObj.questions[parentQuestion.id])	{
								if (!surveyObj.questions[parentQuestion.id].childQuestions) {
									surveyObj.questions[parentQuestion.id].childQuestions = {};
								}
								if (!surveyObj.questions[parentQuestion.id].childQuestions[childQuestion.id]) {
									surveyObj.questions[parentQuestion.id].childQuestions[childQuestion.id] = childQuestion;
								}
							}

							// Didn't find it in the root, search in the children
							// or simplify the query altogether
							// doing below before batery ran out:c
							// console.log('\nALL QUESTIONS', surveyObj.questions)
							for (let key in surveyObj.questions) {
								if (surveyObj.questions.hasOwnProperty(key)) {
									const question = surveyObj.questions[key];
									// console.log('CHECKING key in kids', parentQuestion.id, question.childQuestions)

									if (question.childQuestions[parentQuestion.id]) {

										if (!question.childQuestions[parentQuestion.id].childQuestions) {
											question.childQuestions[parentQuestion.id].childQuestions = {};
										}
										if (!question.childQuestions[parentQuestion.id].childQuestions[childQuestion.id]) {
											question.childQuestions[parentQuestion.id].childQuestions[childQuestion.id] = childQuestion;
										}
									}
								}
							}
						}
					}
				}
			}

			const surveyObjWithSections = {
				title: result.records[0]._fields[0].start.properties.title,
				id: req.params.id,
				sections: {}
			};

			for (const section of sections) {
				surveyObjWithSections.sections[section] = {
					questions: []
				};

				for (const i in surveyObj.questions) {
					if (surveyObj.questions.hasOwnProperty(i)) {

						const question = surveyObj.questions[i];

						if (section === question.section) {
							surveyObjWithSections.sections[section].questions.push(question);
						}
					}
				}
			}

			// console.log('******IT IS ONLY LOADING ONE LEVEL OF CHILDREN. GO ONE LEVEL DEEPER.');
			// console.log('\n\nSURVEY OBJECT');
			// console.log(JSON.stringify(surveyObjWithSections, null, 2));

			return res.send(surveyObjWithSections);
		}
		else {
			return res.status(404).end(`Survey ${req.params.id} not found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const update = async (req, res) => {
	const obj = {
		id: req.body.id,
		name: req.body.name,
		version: req.body.version
	};
	return crud.update(req, res, obj, 'Survey');
};

const getAll = async (req, res) => {
	return crud.getAll(res, 'Survey', `{ type: '${req.params.type}' }`);
};

module.exports = { get, update, getAll };
