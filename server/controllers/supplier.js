const db = require('../db-connection');
const util = require('util');

const stringify = (object) => util.inspect(object, { showHidden: false, depth: null, colors: false, breakLength: Infinity });

const getSubmissionsWithoutAnswers = async (supplierId, surveyId) => {
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
		console.log('[SUPPLIER]submissions without answers', submissions);
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
	console.log('[SUPPLIER] validSupplierDiligence', submissionObj);
	return submissionObj;
};

const cloneSupplierDiligenceSubmission = (supplierId, surveyList) => {
	surveyList.map(async (surveyId) => {
		const submissionsToClone = await getSubmissionsWithoutAnswers(supplierId, surveyId);
		if (submissionsToClone) {
			const previousSubmission = await findValidSupplierDiligenceSubmission(supplierId, surveyId);
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
				console.log('[SUPPLIER] query to clone answers', submissionCloneQuery);
				const response = await db.run(submissionCloneQuery);
				return response;
			}
		}
		return null;
	});
};

const addSubmissionQuery = (contract, contractNode) => (query, survey, surveyIndex)=> {
	const submission = {
		id: survey.id + contract.id,
		surveyId: survey.id,
		contractId: contract.id,
	};
	const submissionNode = `${contractNode}sub${surveyIndex}`;
	query += ` MERGE (${contractNode}) -[:SUBMITS]-> (${submissionNode}:Submission ${stringify(submission)})
									ON CREATE SET ${submissionNode}.status = 'pending'
									WITH ${submissionNode}, ${contractNode}, supplierNode
									MATCH (sur: Survey {id: '${survey.id}'})
									MERGE (${submissionNode})-[:ANSWERS]-> (sur)`;
	return query;
};

const addContractToQuery = (contract, contractIndex) => {
	const {dt, dts} = contract;
	const contractDetails = contract;
	delete contractDetails.dt;
	delete contractDetails.dts;
	const contractNode = `con${contractIndex}`;
	const contractInfo = stringify(contractDetails);
	let contractQuery = ` MERGE (supplierNode)-[:SIGNS]->(${contractNode}:Contract ${contractInfo})
												ON CREATE SET ${contractNode}.dts = '${dts}'
												ON MATCH SET ${contractNode}.dts = ${contractNode}.dts + ', ${dts}'`;
	const diligenceTypes = dt.some((dt) => { dt.id === 'ra'; }) ? dt : [{ id: 'ra' }, ...dt];
	return diligenceTypes.reduce(addSubmissionQuery(contract, contractNode), contractQuery);
};

//new create function - creates supplier, company info submission, all contracts and submissions for each diligence type of contract
const create = async (req, res) => {
	const supplier = stringify(req.body.node);
	let initialQuery = `MERGE (supplierNode:Supplier ${supplier})`;
	const companyInfo = {
		id: `company-info${req.body.node.id}`,
		surveyId: 'company-info',
		contractId: '',
		supplierId: req.body.node.id,
		type: 'topLevel'
	};
	initialQuery += ` MERGE (supplierNode)-[:SUBMITS]->(companyInfoNode:Submission ${stringify(companyInfo)})
										ON CREATE SET companyInfoNode.status = 'pending'
										WITH supplierNode, companyInfoNode
										MATCH (sur:Survey {id: 'company-info'})
										MERGE (companyInfoNode)-[:ANSWERS]-> (sur)`;
	const createQuery = req.body.contracts.map(addContractToQuery).reduce((query, contractQuery)=> (query + contractQuery), initialQuery);
	try{
		console.log('[SUPPLIER] createQuery', createQuery);
		const result = await db.run(createQuery);
		const supplierDiligence = ['as', 'abc', 'bcm', 'pci'];
		await cloneSupplierDiligenceSubmission(req.body.node.id, supplierDiligence);
		res.status(200).send(result);
	}
	catch (e) {
		console.log('initialising database failed', e.toString());
		return res.status(500).end(e.toString());
	}
};

module.exports = { create };
