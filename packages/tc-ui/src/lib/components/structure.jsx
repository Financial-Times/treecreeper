const React = require('react');

const toKebabCase = string =>
	string
		.split(' ')
		.map(str => str.toLowerCase())
		.join('-');

const Concept = ({ name, description, moreInformation }) => (
	<aside className="treecreeper-aside" title="Concept">
		<div className="o-forms-title">
			<div className="o-forms-title__main">A {name} is:</div>
			<div className="description-text o-forms-title__prompt">
				{description}
				<p />
				{moreInformation}
			</div>
		</div>
	</aside>
);

// Has a title, and there are other ways to edit content
// TODO: Need to work with origami and design to find a
// more accessible solution that means we won't need to
// disable the linting
const SectionHeader = ({ title, code, type, includeEditLink = false }) => (
	<>
		{title ? (
			<h2 id={toKebabCase(title)} className="section-heading">
				{title}
				{includeEditLink && code && type ? (
					<>
						<a // eslint-disable-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
							className="o-icons-icon o-icons-icon--edit treecreeper-section-header__edit-link o-layout__unstyled-element"
							href={`/${type}/${code}/edit?#${toKebabCase(
								title,
							)}`}
							title="Edit this section"
						/>
					</>
				) : null}
			</h2>
		) : (
			<h2>no title provided</h2>
		)}
	</>
);

const blockComponents = ['Document'];

const layoutClass = type =>
	blockComponents.includes(type) ? 'block' : 'inline';

const LabelledPrimitive = props => {
	const {
		label,
		showInactive,
		description,
		value,
		type,
		useInSummary,
		id,
		ViewComponent,
		hasValue,
	} = props;

	if (!useInSummary && !hasValue(value, props)) {
		return null;
	}
	return (
		<>
			<dt
				id={`tooltip-${id}`}
				className={`${layoutClass(type)} tooltip-container`}
			>
				{label}
				<span
					className={`tooltip-target-${id} treecreeper-help`}
					id={`tooltip-target-${id}`}
				>
					<i
						aria-label={`help for ${id}`}
						className="o-icons-icon o-icons-icon--info treecreeper-help-icon"
					/>
				</span>
				<div
					data-o-component="o-tooltip"
					data-o-tooltip-position="below"
					data-o-tooltip-target={`tooltip-target-${id}`}
					data-o-tooltip-show-on-click="true"
					// data-o-tooltip-show-on-hover="true"
				>
					<div className="o-tooltip-content">{description}</div>
				</div>
			</dt>
			<dd
				className={`${layoutClass(type)} ${
					showInactive === false ? 'hide-inactive' : ''
				}`}
			>
				<ViewComponent {...props} />
				{showInactive === false ? (
					<button
						type="button"
						className="o-buttons show-inactive-button"
					>
						show inactive records
					</button>
				) : null}
			</dd>
		</>
	);
};

const lastActorLink = (user, system) =>
	user ? (
		<a href={`/Person/${user}`}>{user}</a>
	) : (
		<a href={`/System/${system}`}>{system}</a>
	);

const MetaProperties = ({ data, isCreate }) => {
	const timestamp = isCreate
		? data._createdTimestamp.formatted
		: data._updatedTimestamp.formatted;
	const user = isCreate ? data._createdByUser : data._updatedByUser;
	const client = isCreate ? data._createdByClient : data._updatedByClient;

	return (
		<>
			{isCreate ? 'Created by ' : ' Last updated by '}
			{lastActorLink(user, client)},{' '}
			<time
				data-o-component="o-date"
				className="o-date meta-timestamp"
				dateTime={timestamp}
			/>
		</>
	);
};

const LinkToRecord = ({ id, type, value, linkGenerator }) => {
	const { name, code } = value;
	const href = linkGenerator && linkGenerator({ type, ...value });
	return (
		<a id={id} href={href || `/${type}/${encodeURIComponent(code)}`}>
			{name || code}
		</a>
	);
};

module.exports = {
	LinkToRecord,
	Concept,
	SectionHeader,
	LabelledPrimitive,
	MetaProperties,
};
