const React = require('react');
const { FormError } = require('../components/messages');
const {
	Concept,
	LabelledPrimitive,
	SectionHeader,
	MetaProperties,
} = require('../components/structure');
const { EditButton, DeleteButton } = require('../components/buttons');

const Properties = ({ fields, data, assignComponent }) => {
	const propertyfields = Object.entries(fields);

	return propertyfields
		.filter(
			([, schema]) =>
				!schema.label.includes('deprecated') &&
				!schema.deprecationReason,
		)
		.map(([name, item]) => {
			const viewModel = {
				value: data[name],
				id: name,
				...item,
				...assignComponent(item.type),
			};

			return viewModel.label ? (
				<LabelledPrimitive {...viewModel} />
			) : null;
		});
};

const View = props => {
	const {
		schema,
		data,
		error,
		querystring,
		assignComponent,
		Subheader = () => null,
	} = props;
	return (
		<>
			<div className="o-layout__sidebar" />
			<main className="o-layout__main">
				<div className="o-layout__main__full-span">
					<FormError
						type={schema.name}
						code={data.code}
						error={error}
					/>
					<div className="o-layout-typography">
						<h1 id="record-title" className="record-title">
							{schema.name}: {data.name || data.code}
						</h1>

						<div
							data-o-component="o-expander"
							className="o-expander"
							data-o-expander-shrink-to="hidden"
							data-o-expander-collapsed-toggle-text={`Show the definition of "${schema.name}"`}
							data-o-expander-expanded-toggle-text="Hide definition"
						>
							<button
								className="o-expander__toggle o--if-js"
								type="button"
							/>
							<div className="o-expander__content">
								<Concept
									name={schema.type}
									description={schema.description}
									moreInformation={schema.moreInformation}
								/>
							</div>
						</div>
						<Subheader {...props} />
					</div>
					<div className="biz-ops-cta-container--sticky">
						<EditButton
							type={schema.type}
							code={data.code}
							querystring={querystring || ''}
						/>
						<DeleteButton
							type={schema.type}
							code={data.code}
							querystring={querystring || ''}
						/>
					</div>
					<div className="o-layout-typography">
						{Object.entries(schema.fieldsets).map(
							([name, { heading, properties }]) => (
								<section
									className={`fieldset-biz-ops fieldset-${name}`}
								>
									<SectionHeader
										type={schema.type}
										code={data.code}
										title={heading}
										includeEditLink
									/>
									<dl className="biz-ops-properties-list">
										<Properties
											fields={properties}
											data={data}
											assignComponent={assignComponent}
										/>
									</dl>
								</section>
							),
						)}
						<p>
							<MetaProperties data={data} isCreate />
							.
							<MetaProperties data={data} isCreate={false} />
						</p>
					</div>
				</div>
			</main>
		</>
	);
};

module.exports = View;
