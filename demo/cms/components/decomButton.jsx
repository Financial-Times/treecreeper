const React = require('react');
const fetch = require('node-fetch');

const onDecom = async props => {
    // console.log('props received in onDecom', JSON.stringify(props,null,2))
	const systemCode = props.parentCode;
	const apiResponse = await fetch(
		`/system/${encodeURIComponent(systemCode)}/decommission`,
	).then(results => results.json());
	window.location.reload();
	return apiResponse;
};
const DecomButton = props => {
	if (
		props.lockedBy !== 'biz-ops-runbook-md' ||
		props.lifecycleStage === 'Decommissioned'
	) {
		return null;
	}
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
