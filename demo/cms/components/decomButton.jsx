const React = require('react');

const onDecom = props =>
	console.log('.......decom button - parentCode', props.parentCode);
const onSetDecomNo = () => console.log('......decom no');
const onSetDecomYes = () => console.log('.....decom nyes');
const onChangeSetDecomYes = () => console.log('......omhange decom yes');

const DecomButton = props => {
	console.log('props in decom button');
	return (
		<div className="decommission-override" id="decommission-override">
			<div
				className="o-forms-field o-forms-field--inline"
				role="group"
				aria-labelledby="inline-radio-box-group-title"
			>
				<div className="o-forms-title o-forms-title--vertical-center">
					{/* <span className="o-forms-title__main" id="inline-radio-box-group-title">Mark this system as decommissioned?</span> */}
					<div
						className="inline tooltip-container o-forms-title__main"
						id="inline-radio-box-group-title"
					>
						Mark this system as Decommissioned
						<span
							className="tooltip-target-decomOverride treecreeper-help"
							id="tooltip-target-decomOverride"
						>
							<i
								aria-label="help for decomOverride"
								className="o-icons-icon o-icons-icon--info treecreeper-help-icon"
							></i>
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
								An override for systems locked by Runbook MD.
								Remember to click Save to complete the update!
							</div>
							<button
								className="o-tooltip-close"
								aria-label="Close tooltip"
								title="Close tooltip"
							></button>
						</div>
					</div>
				</div>
				<span className="o-forms-input o-forms-input--radio-box o-forms-input--inline">
					<div className="o-forms-input--radio-box__container">
						<label>
							<input
								className="no-radio"
								type="radio"
								onChange={() =>
									console.log('......onchange no')
								}
								onClick={() => console.log('......no')}
								name="inline"
								value="No"
								aria-label="No"
								checked
								required
							/>
							<span
								className="o-forms-input__label"
								aria-hidden="true"
							>
								No
							</span>
						</label>
						<label>
							<input
								type="radio"
								onClick={onSetDecomYes}
								onChange={onChangeSetDecomYes}
								name="inline"
								value="Yes"
								aria-label="Yes"
								required
							/>
							<span
								className="o-forms-input__label"
								aria-hidden="true"
							>
								Yes
							</span>
						</label>
					</div>
				</span>
			</div>
			<button
				type="button"
				className="o-buttons o-buttons--secondary o-buttons--small decom-button"
				// onClick={props.onDecom(props)}
				onClick={e => console.log('whatever')}
				// data-index={`remove-${index}`}
			>
				Decommission
			</button>
		</div>
	);
};

module.exports = DecomButton;
