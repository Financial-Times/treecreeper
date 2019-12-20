const React = require('react');

const ErrorPage = ({ error, status } = {}) => (
	<main className="o-layout__main">
		<div className="o-layout-typography">
			<h1>Oops! - Something went wrong</h1>
		</div>
		<div
			className="o-message o-message--inner o-message--alert o-message--error biz-ops-alert"
			data-o-component="o-message"
		>
			<div className="o-message__container">
				<div className="o-message__content">
					<p className="o-message__content-main">
						<span className="o-message__content-highlight">
							{status} Error
						</span>
					</p>
					<p className="o-message__content-additional">
						{error.message || error}
					</p>
				</div>
			</div>
		</div>
	</main>
);

module.exports = ErrorPage;
