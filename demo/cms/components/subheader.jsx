const React = require('react');

const Subheader = ({ type, code, data }) => (
	<div className="o-buttons__group">
		{type === 'System' && data.lifecycleStage !== 'Decommissioned' ? (
			<>
				<a
					className="o-buttons o-layout__unstyled-element"
					href={`https://runbooks.in.ft.com/${encodeURIComponent(
						code,
					)}`}
					aria-label={`edit ${code} in Biz-Ops Admin`}
					target="_blank"
					rel="noopener noreferrer"
				>
					View runbook
				</a>{' '}
				<a
					className="o-buttons o-buttons--secondary o-layout__unstyled-element"
					href={`https://heimdall.in.ft.com/system?code=${encodeURIComponent(
						code,
					)}`}
					aria-label={`view the status of ${code} in Heimdall`}
					target="_blank"
					rel="noopener noreferrer"
				>
					View Heimdall dashboard
				</a>{' '}
				<a
					className="o-buttons o-buttons--secondary o-layout__unstyled-element"
					href={`https://sos.in.ft.com/System/${encodeURIComponent(
						code,
					)}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					View SOS rating
				</a>
			</>
		) : null}
		<a
			className="o-buttons o-buttons--secondary o-layout__unstyled-element biz-ops-cta--visualise"
			href={`/${type}/${encodeURIComponent(code)}/visualise`}
			target="_blank"
			rel="noopener noreferrer"
		>
			Visualise
		</a>
	</div>
);

module.exports = { Subheader };
