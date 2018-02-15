const db = require('../db-connection');
const util = require('util');

const stringify = (object) => util.inspect(object, { showHidden: false, depth: null, colors: false, breakLength: Infinity });

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
	let contractCount = req.body.contracts.length;
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
				submittedDate: Date.now()
			};	
			const submissionNode = `${contractNode}sub${surveyIndex}`;
			createQuery += ` MERGE (${contractNode}) -[:SUBMITS]-> (${submissionNode}:Submission ${stringify(submission)})
											ON CREATE SET ${submissionNode}.status = 'pending'
											WITH ${submissionNode}, ${contractNode}, ${supplierNode}
										 	MATCH (sur: Survey {id: '${survey.id}'})
										 	MERGE (${submissionNode})-[:ANSWERS]-> (sur)`;
		});
	});
	console.log('query', createQuery);
	try{
		const result = await db.run(createQuery);
		//check for existing submissions
		findValidSupplierSubmissions(req.body.node.id, 'as');
		console.log('result', result);
		res.send(result);
	}
	catch (e) {
		console.log('initialising database failed', e.toString());
		return res.status(400).end(e.toString());
	}
	
};

const findValidSupplierSubmissions = async (supplierId, surveyId) => {
	const lastOneYear = 
	const subsWithAnswersQuery = `MATCH submissions=(Supplier {id:"${supplierId}"})
									-[:SIGNS]->(Contract)
									-[:SUBMITS]->(submission:Submission {surveyId: "${surveyId}"})
									-[:HAS]->(SubmissionAnswer)
									-[:ANSWERS_QUESTION]->(x: SurveyQuestion) 
									WHERE submission.submittedDate > ${lastOneYear}
									RETURN submissions ORDER BY x.id`;
	const subsWithAnswers = await db.run(subsWithAnswersQuery);
	const subsWithoutAnswersQuery = `MATCH (Supplier {id:"${supplierId}"})
									-[:SIGNS]->(Contract)
									-[r:SUBMITS]->(subs:Submission {surveyId: "${surveyId}"}) 
									WHERE NOT (subs)-[:HAS]->() 
									RETURN subs`;
	const subsWithOutAnswers = await db.run(subsWithoutAnswersQuery); //Contract 2, AS submission
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
			console.log('submissionObj', submissionObj);
			let submissionQuery = `MATCH (submission:Submission {id:'asaB4L00000008TmeKAE'})`;
			Object.keys(submissionObj).forEach((key,index) => {
				const answer = {
					id: key + 'asaB4L00000008TmeKAE',
					questionId: key,
					type: submissionObj[key].type,
					value: submissionObj[key].answer
				}
				if (submissionObj[key].question && submissionObj[key].answer){
					submissionQuery += ` , (question${index}:SurveyQuestion {id : '${key}'}) WITH submission, question${index} 
															CREATE (submission) -[:HAS]-> (:SubmissionAnswer ${stringify(answer)}) -[:ANSWERS_QUESTION]-> (question${index})`	
				}	
			});
			console.log('submissionQuery', submissionQuery);
			const response = await db.run(submissionQuery);
			console.log(response);
	}
}
module.exports = { create };
