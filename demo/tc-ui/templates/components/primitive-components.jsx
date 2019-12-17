const { h } = require('preact');
const { markdown, autolink, formatDateTime } = require('../helpers');

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

const TrafficLight = ({ value }) =>
	value ? (
		<span className={`o-labels o-labels--${value.toLowerCase()}`}>
			{value}
		</span>
	) : null;

const linkHasProtocol = value => value.match(/^https?:/);

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

const { primitives } = require('../../../../packages/tc-ui/server');

const Temporal = ({ value, id, type }) => (
	<span id={id}>{formatDateTime(value.formatted, type)}</span>
);

module.exports = {
	Document,
	Paragraph,
	SystemLifecycle: LifecycleStage,
	ProductLifecycle: LifecycleStage,
	ServiceTier,
	TrafficLight,
	Url,
	Email,
	Date: Temporal,
	DateTime: Temporal,
	Time: Temporal,
	Default: primitives.Text.ViewComponent,
	Boolean: primitives.Boolean.ViewComponent,
	Relationship: primitives.Relationship.ViewComponent,
};
