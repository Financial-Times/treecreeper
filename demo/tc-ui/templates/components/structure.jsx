const { h, Fragment } = require('preact');

const { toKebabCase } = require('../helpers');
const { assignComponent } = require('../../lib/assign-component');

const Concept = ({ name, description, moreInformation }) => (
	<aside className="biz-ops-aside" title="Concept">
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

const GraphvizLibrary = () => (
	<Fragment>
		<script src="https://d3js.org/d3.v4.min.js" />
		<script
			src="https://unpkg.com/viz.js@1.8.1/viz.js"
			type="javascript/worker"
		/>
		<script src="https://unpkg.com/d3-graphviz@2.6.1/build/d3-graphviz.js" />
	</Fragment>
);

// Has a title, and there are other ways to edit content
// TODO: Need to work with origami and design to find a
// more accessible solution that means we won't need to
// disable the linting
const SectionHeader = ({ title, code, type, includeEditLink = false }) => (
	<Fragment>
		{title ? (
			<h2 id={toKebabCase(title)} className="section-heading">
				{title}
				{includeEditLink && code && type ? (
					<Fragment>
						<a // eslint-disable-line jsx-a11y/anchor-has-content
							className="o-icons-icon o-icons-icon--edit biz-ops-section-header__edit-link o-layout__unstyled-element"
							href={`/${type}/${code}/edit?#${toKebabCase(
								title,
							)}`}
							title="Edit this section"
						/>
					</Fragment>
				) : null}
			</h2>
		) : (
			<h2>no title provided</h2>
		)}
	</Fragment>
);

const getPrimitiveComponent = ({ type }) => assignComponent(type).ViewComponent;

const blockComponents = ['Document'];
const temporalTypes = ['DateTime', 'Time', 'Date'];

const layoutClass = type =>
	blockComponents.includes(type) ? 'block' : 'inline';

const hasValue = (value, { type, isRelationship, hasMany }) => {
	if (['Int', 'Float'].includes(type)) {
		return value || value === 0;
	}

	if (temporalTypes.includes(type)) {
		return !!value.formatted;
	}

	if (type === 'Boolean') {
		return typeof value === 'boolean';
	}

	if (isRelationship && hasMany) {
		return value && value.length;
	}
	return !!value;
};

const LabelledPrimitive = props => {
	const {
		label,
		showInactive,
		description,
		value,
		type,
		isRelationship,
		hasMany,
		useInSummary,
		id,
	} = props;
	const PrimitiveComponent = getPrimitiveComponent({
		type,
		isRelationship,
		hasMany,
	});
	if (!useInSummary && !hasValue(value, { type, isRelationship, hasMany })) {
		return null;
	}
	return (
		<Fragment>
			<dt
				id={`tooltip-${id}`}
				className={`${layoutClass(type)} tooltip-container`}
			>
				{label}
				<span
					className={`tooltip-target-${id} biz-ops-help`}
					id={`tooltip-target-${id}`}
				>
					<i
						aria-label={`help for ${id}`}
						className="o-icons-icon o-icons-icon--info biz-ops-help-icon"
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
				<PrimitiveComponent {...props} />
				{showInactive === false ? (
					<button
						type="button"
						className="o-buttons show-inactive-button"
					>
						show inactive records
					</button>
				) : null}
			</dd>
		</Fragment>
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
		<Fragment>
			{isCreate ? 'Created by ' : 'Last updated by '}
			{lastActorLink(user, client)},{' '}
			<time
				data-o-component="o-date"
				className="o-date meta-timestamp"
				dateTime={timestamp}
			/>
		</Fragment>
	);
};

module.exports = {
	Concept,
	GraphvizLibrary,
	SectionHeader,
	LabelledPrimitive,
	MetaProperties,
};
