const React = require('react');

const HeadAssets = ({ mainCss, origamiCss }) => (
	<>
		<link
			rel="icon"
			type="image/png"
			href="https://www.ft.com/__origami/service/image/v2/images/raw/ftlogo-v1%3Abrand-ft-logo-square?source=biz-ops-admin&amp;width=32&amp;height=32&amp;format=png"
			sizes="32x32"
		/>
		<link
			rel="icon"
			type="image/png"
			href="https://www.ft.com/__origami/service/image/v2/images/raw/ftlogo-v1%3Abrand-ft-logo-square?source=biz-ops-admin&amp;width=194&amp;height=194&amp;format=png"
			sizes="194x194"
		/>
		<link
			rel="apple-touch-icon"
			sizes="180x180"
			href="https://www.ft.com/__origami/service/image/v2/images/raw/ftlogo-v1%3Abrand-ft-logo-square?source=biz-ops-admin&amp;width=180&amp;height=180&amp;format=png"
		/>
		<link rel="stylesheet" href={origamiCss} />
		<link href={mainCss} rel="stylesheet" />
	</>
);

const TailAssets = ({ mainJs, origamiJs }) => (
	<>
		<script src={mainJs} defer />

		<script defer src={origamiJs} />
		<script
			dangerouslySetInnerHTML={{
				__html:
					"document.documentElement.classList.replace('core', 'enhanced')",
			}}
		/>
	</>
);

const Layout = props => {
	const { includeFooter = true, Header, Footer } = props;
	return (
		<html className="core" lang="en" data-page-type={props.pageType}>
			<head>
				<title>
					{props.pageTitle
						? `${props.pageTitle} - Biz Ops admin`
						: `Biz Ops admin`}
				</title>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0"
					charSet="UTF-8"
				/>
				<HeadAssets {...props} />
			</head>
			<body>
				<div
					className={`o-layout o-layout--${props.layout || 'docs'}`}
					data-o-component="o-layout"
					data-o-layout-nav-heading-selector=".section-heading, .record-title"
				>
					<Header {...props} />
					{props.children}
					{includeFooter ? <Footer {...props} /> : null}
				</div>
				<TailAssets {...props} />
			</body>
		</html>
	);
};

module.exports = Layout;
