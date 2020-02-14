const React = require('react');
const autolinker = require('autolinker');
const { LinkToRecord } = require('./structure');

const FieldTitle = ({ label, description, expandableContent, lockedBy }) => (
	<span className="o-forms-title">
		<span
			className="o-forms-title__main"
			id="inline-radio-round-group-title"
		>
			{label}:
		</span>

		<span className="o-forms-title__prompt description-text">
			<span
				dangerouslySetInnerHTML={{
					__html:
						typeof window === 'undefined'
							? autolinker.link(description)
							: // eslint-disable-next-line no-undef
							  Autolinker.link(description),
				}}
			/>
			{expandableContent ? (
				<div
					data-o-component="o-expander"
					className="o-expander"
					data-o-expander-shrink-to="hidden"
					data-o-expander-collapsed-toggle-text="more info"
					data-o-expander-expanded-toggle-text="less"
				>
					{' '}
					<button
						className="o-expander__toggle o--if-js"
						type="button"
					>
						more info
					</button>
					<div className="o-expander__content">
						{expandableContent}
					</div>
				</div>
			) : null}
			{lockedBy ? (
				<div className="o-forms__additional-info">
					Not editable. Automatically populated by{' '}
					<LinkToRecord type="System" value={{ code: lockedBy }} />.
				</div>
			) : null}
		</span>
	</span>
);

const WrappedEditComponent = props => {
	props = { ...props, disabled: !!props.lockedBy };
	const { Component } = props;
	const WrapperTag = props.wrapperTag || 'div';
	return (
		<WrapperTag
			className="o-forms-field"
			data-biz-ops-type={props.componentType}
			data-type={props.dataType}
			{...(props.wrapperProps || {})}
		>
			<FieldTitle {...props} />
			<Component {...props} />
		</WrapperTag>
	);
};

module.exports = {
	WrappedEditComponent,
};
