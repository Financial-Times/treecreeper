/* global window */
const React = require('react');
const { RelationshipProperties } = require('./rich-relationship-properties');

class Relationship extends React.Component {
	constructor(props) {
		super();
		this.props = props;
		this.state = {
			annotate: false,
			isMounted: false,
		};

		this.showRichRelationshipEditor = this.showRichRelationshipEditor.bind(
			this,
		);
	}

	componentDidMount() {
		this.setState(prevState => {
			const { isMounted } = prevState;
			const oldState = isMounted;
			return {
				isMounted: !oldState,
			};
		});
	}

	showRichRelationshipEditor(event) {
		this.setState(
			prevState => {
				const { annotate } = prevState;
				const oldState = annotate;
				return {
					annotate: !oldState,
				};
			},
			() => {
				// TODO - can this be done without using global window
				if (window && this.state.isMounted) {
					window.Origami['o-expander'].init();
				}
			},
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
		} = this.props;

		const { isMounted, annotate } = this.state;

		return (
			<>
				<li
					data-name={value.name}
					data-code={value.code}
					className="biz-ops-selected-relationship"
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
							<div
								className="demo-tooltip-container"
								id={`id-${propertyName}-${index}`}
							>
								<button
									type="button"
									disabled={disabled ? 'disabled' : null}
									className={`o-buttons o-buttons--small relationship-annotate-button ${
										disabled ? 'disabled' : ''
									}`}
									onClick={this.showRichRelationshipEditor}
									data-index={`annotate-${index}`}
									id={`id-${propertyName}-${index}`}
								>
									Annotate
								</button>
								<div
									data-o-component="o-tooltip"
									data-o-tooltip-position="above"
									data-o-tooltip-target={`id-${propertyName}-${index}`}
									data-o-tooltip-show-on-hover="true"
								>
									<div className="o-tooltip-content">
										Helps you to save more information about
										this relationship
									</div>
								</div>
							</div>
						</span>
					</span>
					{isMounted && annotate && Object.keys(properties).length ? (
						<span
							className="biz-ops-relationship-annotate"
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
