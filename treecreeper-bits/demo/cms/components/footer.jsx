const React = require('react');

const Footer = () => (
	<div className="o-layout__footer">
		<footer className="o-footer-services">
			<div className="o-footer-services__container">
				<div className="o-footer-services__wrapper o-footer-services__wrapper--top">
					{/* <p className="o-footer-services__logo">Origami</p> */}
					<a
						className="o-footer-services__icon-link o-footer-services__icon-link--github"
						href="http://github.com/financial-times/biz-ops-admin"
					>
						View project on GitHub
					</a>
					<a
						className="o-footer-services__icon-link o-footer-services__icon-link--slack"
						href="https://financialtimes.slack.com/messages/C9S0V2KPV"
					>
						#biz-ops
					</a>
					<p className="o-footer-services__content">
						Contact us on{' '}
						<a href="https://financialtimes.slack.com/messages/C9S0V2KPV">
							slack
						</a>{' '}
						for help, or email{' '}
						<a href="mailto:reliability.engineering@ft.com">
							reliability.engineering@ft.com
						</a>
						.
					</p>
				</div>
			</div>
			<div className="o-footer-services__container">
				<div className="o-footer-services__wrapper o-footer-services__wrapper--legal">
					<div className="o-footer-services__links">
						<a href="http://help.ft.com/help/legal-privacy/cookies/">
							Cookies
						</a>
						<a href="http://help.ft.com/help/legal-privacy/copyright/copyright-policy/">
							Copyright
						</a>
						<a
							href="http://help.ft.com/help/legal-privacy/privacy/"
							className="o-footer-services__bulletted-link"
						>
							Privacy
						</a>
						<a href="http://help.ft.com/help/legal-privacy/terms-conditions">
							Terms &amp; Conditions
						</a>
					</div>
					<p>
						{`© THE FINANCIAL TIMES LTD ${new Date().getFullYear()}. `}
						FT and ‘Financial Times’ are trademarks of The Financial
						Times Ltd.
					</p>
				</div>
			</div>
		</footer>
	</div>
);

module.exports = { Footer };
