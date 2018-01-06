const crud = require('./_crud');
const db = require('../db-connection');

const getNode = (req, res) => {
	return crud.get(req, res, 'Survey');
};

const get = async (req, res) => {

	try {
		const query = `MATCH p=(a:Survey {id:'${req.params.id}'})-[:ASKS]->(b:SurveyQuestion)-[:ALLOWS|:RAISES*0..]->() RETURN p ORDER BY b.id`;
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
								surveyObj.questions[questionAsStart.id] = questionAsStart;
								surveyObj.questions[questionAsStart.id].options = [option];
							}
						}
						else if (segment.relationship.type === 'RAISES') {
							const parentQuestion = segment.start.properties;
							const childQuestion = segment.end.properties;

							childQuestion.parent = parentQuestion.id;
							childQuestion.trigger = segment.relationship.properties.trigger;

							if (surveyObj.questions[parentQuestion.id])	{
								if (!surveyObj.questions[parentQuestion.id].childQuestions) {
									surveyObj.questions[parentQuestion.id].childQuestions = [];
								}
								surveyObj.questions[parentQuestion.id].childQuestions.push(childQuestion);
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

const create = async (req, res) => {

	crud.create(req, res, req.body.node, 'Survey');
	for (let section of req.body.sections) {
		const questions = section.form;

		for (let question of questions) {
			crud.create(req, res, question, 'SurveyQuestion', [
				{name:`ASKS {section: '${section.title}'}`, from: 'Survey', to: 'SurveyQuestion'}
			]);

			if (question.child_questions) {
				for (let child of question.child_questions) {

					crud.create(req, res, child, 'SurveyQuestion', [
						{name:`RAISES  {trigger: '${child.child_question_trigger}'}`, from: 'SurveyQuestion', to: 'SurveyQuestion'}
					]);

					if (child.fieldOptions) {
						for (let option of question.fieldOptions) {
							crud.create(req, res, option, 'SurveyQuestionOption', [
								{name:'ALLOWS', from: 'SurveyQuestion', to: 'SurveyQuestionOption'}
							]);
						}
					}
				}
			}

			if (question.fieldOptions) {
				for (let option of question.fieldOptions) {
					crud.create(req, res, option, 'SurveyQuestionOption', [
						{name:'ALLOWS', from: 'SurveyQuestion', to: 'SurveyQuestionOption'}
					]);
				}
			}
		}
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

const remove = async (req, res) => {
	return crud.remove(req, res, 'Survey');
};

module.exports = { getNode, get, create, update, remove };
