const { h } = require('preact');
const {
	Concept,
	LabelledPrimitive,
	SectionHeader,
	MetaProperties,
} = require('./components/structure');
const {
	EditButton,
	DeleteButton,
	VisualiseButton,
} = require('./components/buttons');
const { FormError } = require('./components/messages');

const Properties = ({ fields, data }) => {
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
			};

			return viewModel.label ? (
				<LabelledPrimitive {...viewModel} />
			) : null;
		});
};

const View = ({ schema, data, error, querystring }) => (
	<main className="o-layout__main">
		<div className="o-layout__main__full-span">
			<FormError type={schema.name} code={data.code} error={error} />
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

				{schema.name === 'System' &&
				data.lifecycleStage !== 'Decommissioned' ? (
					<div className="o-buttons__group">
						<a
							className="o-buttons o-layout__unstyled-element"
							href={`https://runbooks.in.ft.com/${data.code}`}
							aria-label={`edit ${data.code} in Biz-Ops Admin`}
							target="_blank"
							rel="noopener noreferrer"
						>
							View runbook
						</a>{' '}
						<a
							className="o-buttons o-layout__unstyled-element"
							href={`https://heimdall.in.ft.com/system?code=${data.code}`}
							aria-label={`view the status of ${data.code} in Heimdall`}
							target="_blank"
							rel="noopener noreferrer"
						>
							View Heimdall dashboard
						</a>{' '}
						<a
							className="o-buttons o-layout__unstyled-element"
							href={`https://sos.in.ft.com/System/${data.code}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							View SOS rating
						</a>
					</div>
				) : null}
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
				<VisualiseButton
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
								<Properties fields={properties} data={data} />
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
);

module.exports = View;
