/* eslint-disable no-sequences, no-return-assign */
const React = require('react');
const sortBy = require('lodash.sortby');
const { getType } = require('@financial-times/tc-schema-sdk');
const {
	LinkToRecord,
	LabelledPrimitive,
} = require('../../../lib/components/structure');

let RelationshipAnnotator;

const OneRelationship = props => {
	const {
		assignComponent,
		properties,
		type,
		value = {},
		id,
		hasValue,
	} = props;
	let RelationshipProperties = null;
	const validValues = Object.keys(value)
		.filter(key => value[key] && key !== type)
		.reduce((res, key) => ((res[key] = properties[key]), res), {});

	if (Object.keys(validValues).length && hasValue) {
		RelationshipProperties = (
			<div
				data-o-component="o-expander"
				className="o-expander"
				data-o-expander-shrink-to="hidden"
				data-o-expander-collapsed-toggle-text="more info"
				data-o-expander-expanded-toggle-text="less"
			>
				{' '}
				<button className="o-expander__toggle o--if-js" type="button">
					more info
				</button>
				<div className="o-expander__content">
					<dl className="biz-ops-relationship-props-list">
						{Object.entries(validValues).map(([name, item]) => {
							const viewModel = {
								value: value[name],
								id: name,
								...item,
								...assignComponent(item),
							};
							return viewModel.label ? (
								<LabelledPrimitive {...viewModel} />
							) : null;
						})}
					</dl>
				</div>
			</div>
		);
	}

	return type && value[type] ? (
		<>
			<LinkToRecord id={id} type={type} value={value[type]} />
			{RelationshipAnnotator ? (
				<RelationshipAnnotator value={value[type]} type={type} />
			) : null}
			{RelationshipProperties}
		</>
	) : (
		'Error: unable to construct link'
	);
};

const ViewRelationship = props => {
	const { value, type, id, hasMany } = props;
	if (!hasMany) {
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
			{sortBy(value, [`${type}.code`]).map((item, index) => {
				return (
					<li
						key={index}
						className={inactiveCheck(item) ? 'inactive' : 'active'}
					>
						<OneRelationship {...{ ...props, value: item }} />
					</li>
				);
			})}
		</ul>
	) : (
		'Error: unable to construct links'
	);
};

module.exports = {
	ViewRelationship,
	setRelationshipAnnotator: component => {
		RelationshipAnnotator = component;
	},
};
