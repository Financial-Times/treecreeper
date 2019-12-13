const { h } = require('preact');
const { BizOpsLink } = require('../primitive-components');
const { autolink } = require('../../helpers');

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
					__html: autolink(description),
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
					<BizOpsLink
						type="System"
						value={{ code: lockedBy }}
						annotate={false}
					/>
					.
				</div>
			) : null}
		</span>
	</span>
);

module.exports = {
	FieldTitle,
};
