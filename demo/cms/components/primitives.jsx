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

primitives.Relationship.setRelationshipAnnotator(RelationshipAnnotator);

module.exports = {
	ProductLifecycle: { ...primitives.Enum, ViewComponent: LifecycleStage },
	ServiceTier: { ...primitives.Enum, ViewComponent: ServiceTier },
	TrafficLight: { ...primitives.Enum, ViewComponent: TrafficLight },
	Url: { ...primitives.Text, ViewComponent: Url },
	Email: { ...primitives.Text, ViewComponent: Email },
};
