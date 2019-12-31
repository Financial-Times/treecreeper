const React = require('react');

const { HeadAssets, TailAssets } = require('./asset-loading');

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
