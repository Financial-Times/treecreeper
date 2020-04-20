const React = require('react');
const fetch = require('node-fetch');

const onDecom = async props => {
	const fetchtodo = `./decommission`;
	const response = await fetch(fetchtodo);
	const json = await response.json();
	console.log('json response: ', json);
};

const DecomButton = props => {
	console.log('props in decom button');
	return (
		<div
			className="decommission-override"
			id="decommission-override"
			data-props={JSON.stringify(props)}
		>
			<div className="inline tooltip-container">
				Mark this system as Decommissioned
				<span
					className="tooltip-target-decomOverride treecreeper-help"
					id="tooltip-target-decomOverride"
				>
					<i
						aria-label="help for decomOverride"
						className="o-icons-icon o-icons-icon--info treecreeper-help-icon"
					/>
				</span>
				<div
					data-o-component="o-tooltip"
					data-o-tooltip-position="below"
					data-o-tooltip-target="tooltip-target-decomOverride"
					data-o-tooltip-show-on-click="true"
					role="tooltip"
					className="o-tooltip"
				>
					<div className="o-tooltip-content">
						This is an override for systems locked by Runbook MD,
						here for when there is no other way to decommission the
						system.
					</div>
					<button
						className="o-tooltip-close"
						aria-label="Close tooltip"
						title="Close tooltip"
						type="button"
					/>
				</div>
			</div>

			<button
				type="button"
				className="o-buttons o-buttons--secondary o-buttons--small decom-button"
				onClick={() => onDecom(props)}
			>
				Decommission
			</button>
		</div>
	);
};

module.exports = DecomButton;
