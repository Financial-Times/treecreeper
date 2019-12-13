const { h, Fragment } = require('preact');

const primitiveComponents = require('./primitive-components');
const TooltippedComponent = require('./tooltips');

const Code = ({ type, code, value }) => (
	<Fragment>
		<primitiveComponents.Default
			type={type}
			code={code}
			value={value}
			annotate={false}
		/>{' '}
		<a href={`/${type}/${code}/edit`}>edit</a>
	</Fragment>
);

const Name = ({ type, code, value }) => (
	<primitiveComponents.BizOpsLink
		type={type}
		value={{ code, name: value }}
		annotate={false}
	/>
);

const datumDisplayComponents = {
	Code,
	Name,
	...primitiveComponents,
};

const getNestedValue = (row, field) => {
	const parts = field.split('.');
	if (parts[parts.length - 1] === 'phone') {
		return '******';
	}
	let property = row || {};
	parts.forEach(part => {
		if (Array.isArray(property)) {
			property = property.map((value, i) => (
				<Fragment>
					{i > 0 ? <br /> : null}
					{value[part]}
				</Fragment>
			));
		} else {
			property =
				typeof property[part] === 'boolean'
					? property[part]
					: property[part] || '';
		}
	});
	return property;
};

const ColumnHeaders = ({ header }) => (
	<thead>
		{header.map((field, index) => (
			<th tabIndex={index + 1}>{field.title || field.label}</th>
		))}
	</thead>
);

const ColumnValues = ({ type, header, results, querystring }) => (
	<tbody className="list">
		{results.map(row => (
			<tr key={row.code}>
				{header.map(field => {
					const Component =
						datumDisplayComponents[field.type] ||
						datumDisplayComponents.Default;
					return (
						<td className={field.name}>
							{querystring && querystring.tooltips ? (
								<TooltippedComponent
									field={field}
									component={Component}
									type={type}
									code={row.code}
									value={getNestedValue(row, field.name)}
								/>
							) : (
								<Component
									type={type}
									code={row.code}
									value={getNestedValue(row, field.name)}
								/>
							)}
						</td>
					);
				})}
			</tr>
		))}
	</tbody>
);

module.exports = { ColumnHeaders, ColumnValues };
