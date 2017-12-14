const crud = require('./_crud');
const db = require('../db-connection');

const getNode = (req, res) => {
	return crud.get(req, res, 'Contract');
};

const create = async (req, res) => {
	return crud.create(req, res, req.body.node, 'Contract', [{name:'SIGNS', from: 'Supplier', to: 'Contract'}]);
};

const update = async (req, res) => {
	return crud.update(req, res, req.body.node, 'Contract');
};

const remove = async (req, res) => {
	return crud.remove(req, res, 'Contract', true);
};

const getAllforOne = async (req, res) => {
	return crud.getAllforOne(req, res, {name:'SIGNS', from: 'Supplier', to: 'Contract'}, req.params.supplierId);
};

const get = async (req, res) => {
	console.log('getting', req.params.supplierId);
	try {
		const query = `MATCH p=(:Supplier {id:'${req.params.supplierId}'})-[:SIGNS*0..]->()-[r:SUBMITS*0..]->()-[:HAS|:ANSWERS*0..]->()-[:ANSWERS_QUESTION*0..]->() RETURN p`;
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

		if (result.records.length) {
			for (const record of result.records) {
				for (const field of record._fields) {
					console.log('\n');
					let contract;
					let submission;
					let answer;
					let question;
					let survey;

					for (const segment of field.segments) {
						console.log(`${segment.start.labels[0]} (${segment.start.properties.id}), ${segment.end.labels[0]} (${segment.end.properties.id})`);

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

								if (!contractsObj[contract.id]) {
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

								if (!contractsObj[contract.id].submissions[submission.id].answers) {
									contractsObj[contract.id].submissions[submission.id].answers = {};
								}
								contractsObj[contract.id].submissions[submission.id].answers[answer.id] = answer;
							break;

							case 'ANSWERS_QUESTION':
								answer = answer || segment.start.properties;
								question = question || segment.end.properties;
								contractsObj[contract.id].submissions[submission.id].answers[answer.id].questionText = question.text;
							break;

							case 'ANSWERS':
								contract = contract || segment.start.properties;
								survey = survey || segment.end.properties;
								contractsObj[contract.id].submissions[submission.id].surveyId = survey.id;
							break;
						}
					}
				}
			}
		}

		return res.send(contractsObj);
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

module.exports = { getNode, get, getAllforOne, create, update, remove };
