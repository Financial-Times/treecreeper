const crud = require('./_crud');
const db = require('../db-connection');

const getAllforOne = async (req, res) => {
	return crud.getAllforOne(res, {name:'SIGNS', from: 'Supplier', to: 'Contract'}, req.params.supplierId);
};

const get = async (req, res) => {
	try {

		// TODO replace this while thing with _cypher-to-json.js

		const query = `MATCH p=(:Supplier {id:'${req.params.supplierId}'})-[:SIGNS*0..]->()-[r:SUBMITS*0..]->()-[:HAS|:ANSWERS*0..]->()-[:ANSWERS_QUESTION*0..]->(x:SurveyQuestion) RETURN p ORDER BY x.id`;
		console.log('[CONTRACT]', query);

		const result = await db.run(query);

		const contractsObj = {
			//contractId: {
			// 	  ...
			//    submissions : {
			//		submissionId: {
			//			...
			//			answers: {
			//				...
			//				answerId: {
			//					"id": answerId,
            //					"text": "No",
            //					"questionText": ""
			//				}
			//			}
			//	    }
			//    }
			// }
		};

		const supplierObj = {
			submissions: {}
		};

		if (result.records.length) {
			for (const record of result.records) {
				for (const field of record._fields) {
					let contract;
					let submission;
					let answer;
					let question;
					let survey;

					for (const segment of field.segments) {

						switch(segment.relationship.type) {
							case 'SIGNS':
								contract = contract || segment.end.properties;

								if (!contractsObj[contract.id]) {
									contractsObj[contract.id] = contract;
								}
							break;

							case 'SUBMITS':
								contract = contract || segment.start.properties;
								submission = submission || segment.end.properties;

								if (submission.type === 'topLevel') {
									if (!supplierObj.submissions[submission.id]) {
										supplierObj.submissions[submission.id] = submission;
									}
								}
								else if (!contractsObj[contract.id]) {
									contractsObj[contract.id] = contract;
								}
								else {
									if (!contractsObj[contract.id].submissions) {
										contractsObj[contract.id].submissions = {};
									}
									if (!contractsObj[contract.id].submissions[submission.id]) {
										contractsObj[contract.id].submissions[submission.id] = submission;
									}
								}
							break;

							case 'HAS':
								answer = answer || segment.end.properties;
								submission = submission || segment.start.submission;

								if (submission.type === 'topLevel') {
									console.log('\n\n*******TOP LEVEL ANSWER', answer)
									console.log('supplierObj submissions,', supplierObj.submissions[submission.id])
									if (!supplierObj.submissions[submission.id].answers) {
										supplierObj.submissions[submission.id].answers = {};
									}
									console.log('supplierObj submissions after,', supplierObj.submissions[submission.id])
									console.log('writing answer.id', answer.id);
									console.log('now have these many,', supplierObj.submissions[submission.id].answers)
									supplierObj.submissions[submission.id].answers[answer.id] = answer;
								}
								else {

									if (!contractsObj[contract.id].submissions[submission.id].answers) {
										contractsObj[contract.id].submissions[submission.id].answers = {};
									}
									contractsObj[contract.id].submissions[submission.id].answers[answer.id] = answer;
								}

							break;

							case 'ANSWERS_QUESTION':
								answer = answer || segment.start.properties;
								question = question || segment.end.properties;

								if (submission.type === 'topLevel') {
									supplierObj.submissions[submission.id].answers[answer.id].questionText = question.text;
								}
								else {
									contractsObj[contract.id].submissions[submission.id].answers[answer.id].questionText = question.text;
								}
							break;

							case 'ANSWERS':
								if (submission.type === 'topLevel') {
									survey = survey || segment.end.properties;
									supplierObj.submissions[submission.id].surveyId = survey.id;
								}
								else {
									contract = contract || segment.start.properties;
									survey = survey || segment.end.properties;
									contractsObj[contract.id].submissions[submission.id].surveyId = survey.id;
								}
							break;
						}
					}
				}
			}
		}

		const isEmpty = !Object.keys(contractsObj).length;

		if (isEmpty) {
			const message =	`No submissions found for ${req.params.supplierId}`;
			console.log(message);
			return res.status(404).end(message);
		}

		console.log('\n\n\nsupplierObj');
		console.log(JSON.stringify(supplierObj, null, 2));
		// console.log('\n\n\ncontractsObj');
		// console.log(JSON.stringify(contractsObj, null, 2));
		return res.send([contractsObj, supplierObj]);
	}
	catch (e) {
		console.log('[CONTRACT]', e.toString());
		return res.status(500).end(e.toString());
	}
};

module.exports = { get, getAllforOne };
