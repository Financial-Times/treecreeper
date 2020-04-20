const React = require('react');

const DecomButton = props => {
	console.log('props in decom button', props);
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
			<div
				className="o-forms-field decommission-form"
				role="group"
				aria-labelledby="checkbox-group-title"
				aria-describedby="checkbox-group-info"
			>
				<span className="o-forms-input o-forms-input--checkbox">
					<label>
						<input
							type="checkbox"
							name="DecomOverride"
							value
							aria-label="DecomOverride"
						/>
						<span
							className="o-forms-input__label"
							aria-hidden="true">
							Mark this system as Decommissioned
						</span>
					</label>
				</span>
				<div
					className="inline tooltip-container o-forms-title__main"
					id="inline-radio-box-group-title"
				>

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
							Check the box and Save to decommission a system
							locked by RunbookMD.
						</div>
						<button
							className="o-tooltip-close"
							aria-label="Close tooltip"
							title="Close tooltip"
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

module.exports = DecomButton;
