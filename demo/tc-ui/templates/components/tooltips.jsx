const { h } = require('preact');

const overridableTooltipParam = (tooltipAction, fieldType, param) => {
	return (
		(tooltipAction[fieldType] && tooltipAction[fieldType][param]) ||
		tooltipAction.default[param]
	);
};

const TooltippedComponent = props => {
	// Each search result field will show a single tooltip, which provides edit access to the that field,
	// unless overriden by a definition below. e.g. to supply a view link.
	// 		<fieldType>: {
	//			linkScope: <text> to override the default of the current field - e.g. 'Record' for whole record.
	//			viewCaption: <text> to display for 'view' link - the default is no view link.
	//			viewURL: Use '{value}' to force the link to visit the URL - default is biz-ops record.
	//			editParams: Defaults to an edit of the current field - use '?' to force edit of whole record.
	//		}
	const tooltipAction = {
		default: {
			linkScope: `${props.field.name}`,
			viewCaption: '',
			viewURL: '',
			editParams: `?title=${props.field.label}&properties=code,${props.field.name}`,
		},
		Name: {
			linkScope: 'Record',
			viewCaption: 'View',
			viewURL: `${props.type}/${encodeURIComponent(props.code)}`,
			editParams: '?',
		},
		Email: {
			viewCaption: 'Send',
			viewURL: `mailto:${props.value}`,
		},
		Url: {
			viewCaption: 'Visit',
			viewURL: `${props.value}`,
		},
	};
	const Component = props.component;
	const fieldType = props.field.type;

	// What is the scope of the view and edit links?
	// The current field name unless overridden by linkScope text of the tooltip object
	const linkScope = overridableTooltipParam(
		tooltipAction,
		fieldType,
		'linkScope',
	);

	// What does the view tooltip do?
	// Nothing, unless a caption is provided in the viewCaption text of the tooltip object.
	// The view url is the biz-ops record unless '{value}' is supplied in the viewURL text of the definition object
	const viewCaption = overridableTooltipParam(
		tooltipAction,
		fieldType,
		'viewCaption',
	);
	const viewURL = overridableTooltipParam(
		tooltipAction,
		fieldType,
		'viewURL',
	);

	// What is the scope of the the edit link?
	// The current field name unless overriden by the editParams text of the definition object
	const editParams = overridableTooltipParam(
		tooltipAction,
		fieldType,
		'editParams',
	);

	return (
		<div className="inline-dropdown">
			<Component
				type={props.type}
				code={props.code}
				value={props.value}
			/>
			<div className="inline-dropdown-child">
				{viewCaption ? (
					<a href={viewURL}>
						{viewCaption} {linkScope}
					</a>
				) : null}
				<a
					href={`/${props.type}/${encodeURIComponent(
						props.code,
					)}/edit${editParams}`}
				>
					Edit {linkScope}
				</a>
			</div>
		</div>
	);
};

module.exports = TooltippedComponent;
