const { h, Fragment } = require('preact');
const { getType } = require('@financial-times/tc-schema-sdk');
const { LinkToRecord } = require('../../lib/helpers');

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

const OneRelationship = ({ type, value = {}, id, annotate = true }) =>
	type && value.code ? (
		<Fragment>
			<LinkToRecord id={id} type={type} value={value} />
			{annotate ? (
				<Fragment>
					{type === 'System' ? (
						<ServiceTier value={value.serviceTier} />
					) : null}
					{type === 'System' ? (
						<LifecycleStage value={value.lifecycleStage} />
					) : null}
					{type === 'Person' ? (
						<IsActiveLabel isActive={value.isActive} />
					) : null}
					{type === 'Team' ? (
						<IsActiveLabel isActive={value.isActive} />
					) : null}
					{type === 'Repository' ? (
						<IsActiveLabel isActive={!value.isArchived} />
					) : null}
				</Fragment>
			) : null}
		</Fragment>
	) : (
		'Error: unable to construct link'
	);

const ViewRelationship = ({ value, type, id, hasMany }) => {
	if (!hasMany) {
		const props = { type, value, id };
		return <OneRelationship {...props} />;
	}
	const schema = getType(type);
	const inactiveCheck = datum => {
		if (schema.inactiveRule) {
			return Object.entries(schema.inactiveRule).every(
				([prop, expectedValue]) => datum[prop] === expectedValue,
			);
		}
		return datum.isActive === false;
	};
	return Array.isArray(value) ? (
		<ul id={id} className="o-layout__unstyled-element biz-ops-links">
			{value.map(item => {
				const props = { type, value: item };
				return (
					<li className={inactiveCheck(item) ? 'inactive' : 'active'}>
						<OneRelationship {...props} />
					</li>
				);
			})}
		</ul>
	) : (
		'Error: unable to construct links'
	);
};

module.exports = { ViewRelationship };
