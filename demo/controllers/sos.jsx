const React = require('react');
const {renderHtml} = require('../cms/render/react-renderer');
const fetch = require('node-fetch');
const httpError = require('http-errors');

class ApiClient {
	constructor(options) {
		this.options = options;
		Object.assign(this, options);
	}

	getHeaders() {
		return {
			'content-type': 'application/json',
			'client-id': 'rhys'
		};
	}

	async extractErrorMessage(response) {
		let errorMessage;
		try {
			const errors = await response.json();
			errorMessage = errors.errors
				? errors.errors.map(error => error.message).join('\n')
				: errors.error;
		} catch (err) {
			errorMessage = response.statusText;
		}
		return httpError(response.status, errorMessage);
	}

	async logAndThrowError(response, props) {
		const error = await this.extractErrorMessage(response);
		this.logger.error(
			{
				error,
				event: 'API_ERROR',
			},
			props,
			`Api call failed with status ${response.status}`,
		);
		throw error;
	}

	async fetchGraphQL(query) {
		try {
			const response = await fetch('http://local.in.ft.com:8888/api/graphql', {
				method: 'POST',
				body: JSON.stringify({query}),
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw await this.extractErrorMessage(response);
			}

			const json = await response.json();

			if (json.errors) {
				this.logger.error(
					{
						errors: json.errors,
						variables: body.variables,
						event: 'GRAPHQL_ERRORS',
					},
					'BizOps Graphql call had errors',
				);
			}
			return json.data;
		} catch (error) {
			this.logger.error(
				{ error, query: query, event: 'GRAPHQL_REQUEST' },
				'BizOps Graphql call failed',
			);
			throw httpError(500, error);
		}
	}

}



const Template = ({results}) => {
return <><div className="o-layout-sidebar"></div><main classname="o-layout__main"><div className="o-table-container">
				<div className="o-table-overlay-wrapper">
					<div className="o-table-scroll-wrapper">
						<table
							id="league-table"
							className="o-table o-table--horizontal-lines o-table--responsive-overflow"
							data-o-component="o-table"
							data-o-table-responsive="overflow"
						>
							<thead>
								<tr>
									<th scope="col" role="columnheader">
										System
									</th>
									<th>Score</th>
									<th>Critical errors</th>
								</tr>
							</thead>
							<tfoot><tr>
								<td></td>
								<td>Average: {results.reduce((sum, {sosWeightedScore}) => sum + sosWeightedScore, 0) / results.length}</td>
								<td>Total: {results.reduce((sum, {sosCriticalErrors}) => sum + sosCriticalErrors, 0)}</td>
							</tr></tfoot>
							<tbody>
								{results.map(({code, sosWeightedScore, sosCriticalErrors}) => {
									return (
										<tr>
											<td>
													{code}
											</td>
											<td>{sosWeightedScore}</td>
											<td>{sosCriticalErrors}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div></main></>
}


const Form = () => {
return <><div className="o-layout-sidebar"></div><main classname="o-layout__main">
				<form>
					<textarea name="query"></textarea>
					<button type="submit">submit</button>
				</form>
				</main></>
}

module.exports = async (req, res) => {
	const {query} = req.query;

	if (!query) {
		return res.send(renderHtml(Form, {}))
	}

	// /{Systems%20(filter:{lifecycleStage_not:Decommissioned,%20deliveredBy:{code:"reliability-engineering"}})%20{code%20sosWeightedScore%20sosCriticalErrors}}

	const client = new ApiClient({logger: console});

	const data = await client.fetchGraphQL(query);

	res.send(renderHtml(Template, {
		results: data.Systems
	}))
}
