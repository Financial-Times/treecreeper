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
		propertyName,
		assignComponent,
		properties,
		type,
		value = {},
		id,
		hasValue,
		linkGenerator,
	} = props;
	let RelationshipProperties = null;
	// value[propertyName] !== null since neo4j returns null if there is no value

	if (!value) {
		return null;
	}

	const relationshipProperties = Object.entries(properties).filter(
		([name]) => value[name] !== null,
	);

	if (relationshipProperties.length && hasValue) {
		RelationshipProperties = (
			<div
				data-o-component="o-expander"
				className="o-expander"
				data-o-expander-shrink-to="hidden"
				data-o-expander-collapsed-toggle-text="view details"
				data-o-expander-expanded-toggle-text="hide details"
			>
				{' '}
				<button className="o-expander__toggle o--if-js" type="button">
					view details
				</button>
				<div className="o-expander__content">
					<dl className="treecreeper-relationship-props-list">
						{relationshipProperties.map(
							([name, propDef], index) => {
								const viewModel = {
									value: value[name],
									id: name,
									...propDef,
									...assignComponent(propDef),
								};
								return viewModel.label ? (
									<span key={index}>
										<LabelledPrimitive {...viewModel} />
									</span>
								) : null;
							},
						)}
					</dl>
				</div>
			</div>
		);
	}

	return type && value[type] ? (
		<>
			<LinkToRecord
				id={id}
				type={type}
				value={value[type]}
				linkGenerator={linkGenerator}
			/>
			{RelationshipAnnotator ? (
				<RelationshipAnnotator
					value={value[type]}
					type={type}
					relationshipProperties={value}
					propertyName={propertyName}
				/>
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
				([prop, expectedValue]) => datum[type][prop] === expectedValue,
			);
		}
		return datum[type].isActive === false;
	};
	return Array.isArray(value) ? (
		<ul id={id} className="o-layout__unstyled-element treecreeper-links">
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
