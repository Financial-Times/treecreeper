const { h, Fragment } = require('hyperons');
const { getType } = require('../schema-sdk');
const { markdown, autolink, formatDateTime } = require('./helpers');

const maybe = func => opts =>
	opts.value && opts.value.formatted && opts.value.formatted !== null
		? func(opts)
		: null;

const Document = ({ value, id }) => (
	<section id={id} dangerouslySetInnerHTML={{ __html: markdown(value) }} />
);

const Paragraph = ({ value, id }) => (
	<p id={id} dangerouslySetInnerHTML={{ __html: autolink(value) }} />
);

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

const TrafficLight = ({ value }) =>
	value ? (
		<span className={`o-labels o-labels--${value.toLowerCase()}`}>
			{value}
		</span>
	) : null;

const yesNoUnknown = value => {
	if (value === true) return 'Yes';
	if (value === false) return 'No';
	return 'Unknown';
};

const linkHasProtocol = value => value.match(/^https?:/);

const Boolean = ({ value, id }) => <span id={id}>{yesNoUnknown(value)}</span>;

const Url = ({ value, id }) => {
	if (!value) return null;
	return linkHasProtocol(value) ? (
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

const Team = ({ value }) =>
	value ? (
		<BizOpsLink
			type="Team"
			value={value}
			id={value.code}
			annotate={false}
		/>
	) : null;

const BizOpsLink = maybe(({ type, value = {}, id, annotate = true }) =>
	type && value.code ? (
		<Fragment>
			<a id={id} href={`/${type}/${encodeURIComponent(value.code)}`}>
				{value.name || value.code}
			</a>
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
	),
);

const BizOpsLinks = ({ value: items, type, id }) => {
	const schema = getType(type);
	const inactiveCheck = value => {
		if (schema.inactiveRule) {
			return Object.entries(schema.inactiveRule).every(
				([prop, expectedValue]) => value[prop] === expectedValue,
			);
		}
		return value.isActive === false;
	};
	return Array.isArray(items) ? (
		<ul id={id} className="o-layout__unstyled-element biz-ops-links">
			{items.map(value => {
				const props = { type, value };
				return (
					<li
						className={inactiveCheck(value) ? 'inactive' : 'active'}
					>
						<BizOpsLink {...props} />
					</li>
				);
			})}
		</ul>
	) : (
		'Error: unable to construct links'
	);
};
const Temporal = maybe(({ value, id, type }) => (
	<span id={id}>{formatDateTime(value.formatted, type)}</span>
));

const Default = ({ value, id }) => <span id={id}>{value}</span>;

module.exports = {
	Document,
	Paragraph,
	SystemLifecycle: LifecycleStage,
	ProductLifecycle: LifecycleStage,
	ServiceTier,
	TrafficLight,
	Boolean,
	linkHasProtocol,
	Url,
	Email,
	BizOpsLink,
	BizOpsLinks,
	Date: Temporal,
	DateTime: Temporal,
	Time: Temporal,
	Team,
	Default,
};
