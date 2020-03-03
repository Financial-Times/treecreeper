const React = require('react');
const { RelationshipProperties } = require('./rich-relationship-properties');

class Relationship extends React.Component {
	constructor(props) {
		super();
		this.props = props;
		this.state = {
			isMounted: false,
			isEditing: this.props.annotate,
		};

		this.showRichRelationshipEditor = this.showRichRelationshipEditor.bind(
			this,
		);
	}

	componentDidMount() {
		this.setState(prevState => {
			const { isMounted } = prevState;
			return {
				isMounted: !isMounted,
			};
		});
	}

	showRichRelationshipEditor(event) {
		this.setState(
			{
				isEditing: true,
			},
			() => this.props.toggleAnnotation(),
		);
		event.stopPropagation();
	}

	render() {
		const {
			value,
			disabled,
			onRelationshipRemove,
			index,
			properties,
			propertyName,
			annotate,
		} = this.props;

		const { isMounted, isEditing } = this.state;
		const relationshipPropKeys = properties && Object.keys(properties);
		const canBeAnnotated =
			relationshipPropKeys && relationshipPropKeys.length > 0;
		const hasAnnotations =
			relationshipPropKeys &&
			relationshipPropKeys.filter(propName => value[propName]);

		const annotateButtonLabel =
			hasAnnotations && hasAnnotations.length
				? 'Edit annotations'
				: 'Add annotations';
		return (
			<>
				<li
					data-name={value.name}
					data-code={value.code}
					className="treecreeper-selected-relationship"
					key={index}
				>
					<span>
						<span className="o-layout-typography">
							{value.name || value.code}
						</span>
						<span>
							<button
								type="button"
								disabled={disabled ? 'disabled' : null}
								className={`o-buttons o-buttons--small relationship-remove-button ${
									disabled ? 'disabled' : ''
								}`}
								onClick={onRelationshipRemove}
								data-index={`remove-${index}`}
							>
								Remove
							</button>
							{canBeAnnotated ? (
								<div
									className="demo-tooltip-container"
									id={`id-${propertyName}-${index}`}
								>
									<button
										type="button"
										disabled={
											disabled || isEditing
												? 'disabled'
												: null
										}
										className={`o-buttons o-buttons--small relationship-annotate-button ${
											disabled ? 'disabled' : ''
										}`}
										onClick={
											this.showRichRelationshipEditor
										}
										data-index={`annotate-${index}`}
										id={`id-${propertyName}-${index}`}
									>
										{annotateButtonLabel}
									</button>
									<div
										data-o-component="o-tooltip"
										data-o-tooltip-position="above"
										data-o-tooltip-target={`id-${propertyName}-${index}`}
										data-o-tooltip-show-on-hover="true"
									>
										<div className="o-tooltip-content">
											Helps you to save more information
											about this relationship
										</div>
									</div>
								</div>
							) : null}
						</span>
					</span>
					{isMounted && annotate && canBeAnnotated ? (
						<span
							className="treecreeper-relationship-annotate"
							key={index}
						>
							<RelationshipProperties
								key={index}
								{...this.props}
							/>
						</span>
					) : null}
				</li>
			</>
		);
	}
}
module.exports = { Relationship };
