const React = require('react');

const { primitives } = require('@financial-times/tc-ui');

const oLabelsModifiersMap = {
	platinum: 'tier-platinum',
	gold: 'tier-gold',
	silver: 'tier-silver',
	bronze: 'tier-bronze',
	unsupported: 'support-dead',
	undefined: 'unknown',
	null: 'unknown',
	unknown: 'unknown',
	inactive: 'support-dead',
	preproduction: 'support-experimental',
	production: 'support-active',
	deprecated: 'support-deprecated',
	decommissioned: 'support-dead',
	incubate: 'support-experimental',
	sustain: 'support-active',
	grow: 'support-active',
	sunset: 'support-deprecated',
};

const Label = ({ value, fallbackText, id }) => (
	<span
		id={id}
		className={`o-layout--unstyled-element o-labels o-labels--${
			oLabelsModifiersMap[value ? value.toLowerCase() : 'unknown']
		}`}
	>
		{value || fallbackText}
	</span>
);

const getLabelWithFallback = fallbackText => props =>
	Label({ fallbackText, ...props });

const LifecycleStage = getLabelWithFallback('Unknown lifecycle stage');

const ServiceTier = getLabelWithFallback('Unknown service tier');

const TrafficLight = ({ value }) =>
	value ? (
		<span className={`o-labels o-labels--${value.toLowerCase()}`}>
			{value}
		</span>
	) : null;

const IsActiveLabel = ({ isActive }) =>
	isActive ? null : (
		<span
			className={`o-labels o-labels--${
				oLabelsModifiersMap[isActive === false ? 'inactive' : 'unknown']
			}`}
		>
			{isActive === false ? 'Inactive' : 'May not be active'}
		</span>
	);

const Url = ({ value, id }) => {
	if (!value) return null;
	return value.match(/^https?:/) ? (
		<a id={id} href={value}>
			{value}
		</a>
	) : (
		value
	);
};

const Email = ({ value, id }) =>
	value ? (
		<a id={id} href={`mailto:${value}`}>
			{value}
		</a>
	) : null;

const RelationshipAnnotator = ({ type, value }) => (
	<>
		{type === 'MainType' ? (
			<span> hydrogen: {value.someString}</span>
		) : null}
		{type === 'System' || type === 'Product' ? (
			<LifecycleStage value={value.lifecycleStage} />
		) : null}
		{type === 'Person' ? <IsActiveLabel isActive={value.isActive} /> : null}
		{type === 'Team' ? <IsActiveLabel isActive={value.isActive} /> : null}
		{type === 'Repository' ? (
			<IsActiveLabel isActive={!value.isArchived} />
		) : null}
	</>
);

// const onDecom = props => console.log('decom button - parentCode', props.parentCode)
// const DecomButton = props => {
// 	console.log('props in decom button')
// 	return (
// 	<div className='decommision-override'>
// 		<span>Mark this system as Decommissioned (override for systems locked by Runbook MD):   </span>
// 		<button
// 			type="button"
// 			// disabled={disabled ? 'disabled' : null}
// 			// className={`o-buttons o-buttons--secondary o-buttons--small decom-button ${
// 			// 	disabled ? 'disabled' : ''
// 			// }`}
// 			className="o-buttons o-buttons--secondary o-buttons--small decom-button"
// 			onClick={onDecom(props)}
// 			// data-index={`remove-${index}`}
// 		>
// 			Decommission
// 		</button>
// 	</div>
// )};

{/* <dt id="tooltip-primaryURL" className="inline tooltip-container">Primary URL
	<span className="tooltip-target-primaryURL treecreeper-help" id="tooltip-target-primaryURL">
		<i aria-label="help for primaryURL" className="o-icons-icon o-icons-icon--info treecreeper-help-icon"></i>
	</span>
	<div data-o-component="o-tooltip" data-o-tooltip-position="below" data-o-tooltip-target="tooltip-target-primaryURL" data-o-tooltip-show-on-click="true" role="tooltip" className="o-tooltip">
		<div className="o-tooltip-content">The main url served by the system.</div>
		<button className="o-tooltip-close" aria-label="Close tooltip" title="Close tooltip"></button>
	</div>
</dt> */}

const onDecom = props => console.log('decom button - parentCode', props.parentCode)
const DecomButton = props => {
	console.log('props in decom button')
	return (
	<div className="decommission-override">
		<div className="inline tooltip-container">Mark this system as Decommissioned
			<span className="tooltip-target-decomOverride treecreeper-help" id="tooltip-target-decomOverride">
				<i aria-label="help for decomOverride" className="o-icons-icon o-icons-icon--info treecreeper-help-icon"></i>
			</span>
			<div data-o-component="o-tooltip" data-o-tooltip-position="below" data-o-tooltip-target="tooltip-target-decomOverride" data-o-tooltip-show-on-click="true" role="tooltip" className="o-tooltip">
				<div className="o-tooltip-content">An override for systems locked by Runbook MD. Remember to click Save to complete the update!</div>
				<button className="o-tooltip-close" aria-label="Close tooltip" title="Close tooltip"></button>
			</div>
		</div>
		{/* should this be a checkbox? */}
		<button
			type="button"
			// disabled={disabled ? 'disabled' : null}
			// className={`o-buttons o-buttons--secondary o-buttons--small decom-button ${
			// 	disabled ? 'disabled' : ''
			// }`}
			className="o-buttons o-buttons--secondary o-buttons--small decom-button"
			onClick={onDecom(props)}
			// data-index={`remove-${index}`}
		>
			Decommission
		</button>
		<div className="o-forms-field o-forms-field--inline" role="group" aria-labelledby="inline-radio-box-group-title">
			<span className="o-forms-title o-forms-title--vertical-center">
				<span className="o-forms-title__main" id="inline-radio-box-group-title">Mark this system as decommissioned?</span>
			</span>
			<span className="o-forms-input o-forms-input--radio-box o-forms-input--inline">
				<div className="o-forms-input--radio-box__container">
					<label>
						<input type="radio" name="inline" value="No" aria-label="No" checked required/>
						<span className="o-forms-input__label" aria-hidden="true">No</span>
					</label>
					<label>
						<input type="radio" name="inline" value="Yes" aria-label="Yes" required/>
						<span className="o-forms-input__label" aria-hidden="true">Yes</span>
					</label>
				</div>
			</span>
		</div>
	</div>
)};
primitives.Relationship.setRelationshipAnnotator(RelationshipAnnotator);

module.exports = {
	SystemLifecycle: {
		// can i chuck another edit component and use biz-ops to
		...primitives.Enum,
		AdditionalEditComponent: DecomButton,
		ViewComponent: LifecycleStage,
	},
	ProductLifecycle: { ...primitives.Enum, ViewComponent: LifecycleStage },
	ServiceTier: { ...primitives.Enum, ViewComponent: ServiceTier },
	TrafficLight: { ...primitives.Enum, ViewComponent: TrafficLight },
	Url: { ...primitives.Text, ViewComponent: Url },
	Email: { ...primitives.Text, ViewComponent: Email },
};
