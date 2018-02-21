const db = require('../db-connection');
const util = require('util');

const stringify = (object) => util.inspect(object, { showHidden: false, depth: null, colors: false, breakLength: Infinity });

const getSupplierDiligenceWithoutSubmissions = async (supplierId, surveyId) => {
	const submissions = [];
	const subsWithoutAnswersQuery = `MATCH (Supplier {id:"${supplierId}"})
									-[:SIGNS]->(Contract)
									-[r:SUBMITS]->(subs:Submission) 
									WHERE NOT (subs)-[:HAS]->() 
									AND subs.surveyId IN ["${surveyId}"]
									RETURN subs`;
	const submissionsWithoutAnswers = await db.run(subsWithoutAnswersQuery); 
	if (submissionsWithoutAnswers.records.length){
		submissionsWithoutAnswers.records.forEach(submission => {
			submissions.push(submission._fields[0].properties.id);
		});
		console.log('submissions', submissions);
		return submissions;
	}
	return null;
};

const findValidSupplierDiligenceSubmission = async (supplierId, surveyId) => {
	let timeSinceLastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).valueOf();
	const subsWithAnswersQuery = `MATCH submissions=(Supplier {id:"${supplierId}"})
									-[:SIGNS]->(Contract)
									-[:SUBMITS]->(submission:Submission {surveyId: "${surveyId}"})
									-[:HAS]->(SubmissionAnswer)
									-[:ANSWERS_QUESTION]->(x: SurveyQuestion) 
									WHERE submission.status IN ['submitted', 'resubmitted'] 
									AND submission.submittedDate > ${timeSinceLastYear}
									RETURN submissions ORDER BY submission.submittedDate desc`;
	const subsWithAnswers = await db.run(subsWithAnswersQuery);
	let submissionObj = {};
	if (subsWithAnswers.records.length) {
		for (const record of subsWithAnswers.records) {
			for (const field of record._fields) {
				let submission;
				let submissionAnswer;
				let surveyQuestion;
				for (const segment of field.segments) {
					switch(segment.relationship.type) {
						case 'SUBMITS':
							submission = submission || segment.end.properties;
							submissionObj.status = submission.status;
							submissionObj.id = submission.id;
						break;
						case 'HAS':
							submissionAnswer = submissionAnswer || segment.end.properties;

							if (!submissionObj[submissionAnswer.questionId]) {
								submissionObj[submissionAnswer.questionId] = {
									answer: submissionAnswer.value,
									type: submissionAnswer.type,
								};
							}
							else {
								submissionObj[submissionAnswer.questionId].answer = submissionAnswer.value;
							}
						break;
						case 'ANSWERS_QUESTION':
							surveyQuestion = surveyQuestion || segment.end.properties;

							if (!submissionObj[surveyQuestion.id]) {
								submissionObj[surveyQuestion.id] = {
									question: surveyQuestion.text,
								};
							}
							else {
								submissionObj[surveyQuestion.id].question = surveyQuestion.text;
							}
						break;
					}
				}
			}
		}
	}
	return submissionObj;
};

const cloneSupplierDiligenceSubmission = async (supplierId, surveyId) => {
	const submissionsToClone = await getSupplierDiligenceWithoutSubmissions(supplierId, surveyId);
	if (submissionsToClone) {
		const previousSubmission = await findValidSupplierDiligenceSubmission(supplierId, surveyId);
		console.log('[SUPPLIER] previousSubmission', previousSubmission);
		if(Object.values(previousSubmission).length > 0) {
			let submissionCloneQuery = '';
			//MATCH submissions
			submissionsToClone.forEach( (submissionId, submissionIndex) => {
				submissionCloneQuery += submissionIndex === 0 ? 'MATCH ' : '';
				submissionCloneQuery += `(submission${submissionIndex}:Submission {id: '${submissionId}'}),` ;
			});
			//MATCH questions
			Object.keys(previousSubmission).forEach((key, questionIndex) => {
				if(previousSubmission[key].question){
					submissionCloneQuery += `(question${questionIndex}:SurveyQuestion {id : '${key}'}),`;
				}
			});
			submissionCloneQuery = submissionCloneQuery.slice(0, -1);
			submissionCloneQuery += 'CREATE ';
			//CREATE answers and relationship to survey questions
			submissionsToClone.forEach((submissionId, submissionIndex) => {	
				Object.keys(previousSubmission).forEach((key,answerIndex) => {
				if (previousSubmission[key].question){
					const answer = {
						id: key + submissionId,
						questionId: key,
						type: previousSubmission[key].type,
						value: previousSubmission[key].answer
					};
					submissionCloneQuery += `(submission${submissionIndex}) -[:HAS]-> (:SubmissionAnswer ${stringify(answer)}) -[:ANSWERS_QUESTION]-> (question${answerIndex}),`;	
				}	
				});
			});
			submissionCloneQuery = submissionCloneQuery.slice(0, -1);	
			console.log('submissionQuery', submissionCloneQuery);
			const response = await db.run(submissionCloneQuery);
			return response;
		}
	}
	return null;
};

//new create function - creates supplier, company info submission, all contracts and submissions for each diligence type of contract
const create = async (req, res) => {
	const supplierNode = 'supplierNode';
	const supplier = stringify(req.body.node);
	let createQuery = `MERGE (${supplierNode}:Supplier ${supplier})`;
	const companyInfoNode = 'companyInfoNode';
	const companyInfo = {
		id: `company-info${req.body.node.id}`,
		surveyId: 'company-info',
		contractId: '',
		supplierId: req.body.node.id,
		status: 'pending',
		type: 'topLevel'
	};
	createQuery += ` MERGE (${supplierNode})-[:SUBMITS]->(${companyInfoNode}:Submission ${stringify(companyInfo)}) 
										WITH ${supplierNode}, ${companyInfoNode} 
										MATCH (sur:Survey {id: 'company-info'}) 
										MERGE (${companyInfoNode})-[:ANSWERS]-> (sur)`;
	req.body.contracts.forEach((contract, contractIndex) => {
		const {dt} = contract;
		const contractDetails = contract;
		delete contractDetails.dt;
		const contractNode = `con${contractIndex}`;
		const contractInfo = stringify(contractDetails);
		createQuery += ` MERGE (${supplierNode})-[:SIGNS]->(${contractNode}:Contract ${contractInfo})`;
		dt.forEach((survey, surveyIndex)=> {
			const submission = {
				id: survey.id + contract.id,
				surveyId: survey.id,
				contractId: contract.id,
			};	
			const submissionNode = `${contractNode}sub${surveyIndex}`;
			createQuery += ` MERGE (${contractNode}) -[:SUBMITS]-> (${submissionNode}:Submission ${stringify(submission)})
											ON CREATE SET ${submissionNode}.status = 'pending'
											WITH ${submissionNode}, ${contractNode}, ${supplierNode}
											MATCH (sur: Survey {id: '${survey.id}'})
											MERGE (${submissionNode})-[:ANSWERS]-> (sur)`;
		});
	});
	try{
		const result = await db.run(createQuery);
		console.log('result', result);
		const supplierDiligence = ['as', 'abc', 'bcm', 'pci'];
		supplierDiligence.map(async (surveyId) => {
			const cloneResult = await cloneSupplierDiligenceSubmission(req.body.node.id, surveyId);	
		});
		res.status(200).send(result);
	}
	catch (e) {
		console.log('initialising database failed', e.toString());
		return res.status(500).end(e.toString());
	}
};

module.exports = { create };
