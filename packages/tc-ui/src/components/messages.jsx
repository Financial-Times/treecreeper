const React = require('react');

const InnerMessage = ({ message, type, isInner = false }) => (
	<section
		className={`o-message o-message${
			isInner ? '--inner' : ''
		} o-message--alert o-message--${type}`}
		data-o-component="o-message"
	>
		<div className="o-message__container">
			<div className="o-message__content">
				<p className="o-message__content-main">{message}</p>
			</div>
		</div>
	</section>
);

const Message = ({
	message,
	isBanner = false,
	messageType = 'inform',
	isInner,
}) => {
	const inner = (
		<InnerMessage message={message} type={messageType} isInner={isInner} />
	);
	return isBanner ? <div className="o-message--success">{inner}</div> : inner;
};

const FormError = props => {
	if (props.error) {
		return (
			<div
				className="o-message o-message--inner o-message--alert o-message--error biz-ops-alert"
				data-o-component="o-message"
			>
				<div className="o-message__container">
					<div className="o-message__content">
						<p className="o-message__content-main">
							<span className="o-message__content-highlight">
								Oops.
							</span>
							<span className="o-message__content-detail">
								{` Could not ${props.error.action} ${props.type} record for ${props.code}.`}
							</span>
						</p>
						<p className="o-message__content-additional">{`${props.error.message}`}</p>
					</div>
				</div>
			</div>
		);
	}
};

module.exports = { Message, FormError };
