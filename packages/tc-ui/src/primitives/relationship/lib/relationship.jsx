/* global window */
const React = require('react');
const { RichRelationships } = require('./rich-relationship');

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
			propertyName,
		} = this.props;
		const { isMounted, annotate } = this.state;

		return (
			<>
				<li
					data-name={value.name}
					data-code={value.code}
					className="selected-relationship"
					key={index}
				>
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
						<span className="o-layout-typography">
							{value.name || value.code}
						</span>
						<button
							type="button"
							disabled={disabled ? 'disabled' : null}
							className={`o-buttons o-buttons--small relationship-annotate-button ${
								disabled ? 'disabled' : ''
							}`}
							onClick={this.showRichRelationshipEditor}
							data-index={`annotate-${index}`}
						>
							Annotate
						</button>
					</span>
					{isMounted && annotate ? (
						<span className="biz-ops-relationship-annotate">
							<RichRelationships
								key={`${index}-${propertyName}`}
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
