const { h } = require('preact');

const { getAssetReferences } = require('./asset-references');

const toKebabCase = string =>
	string
		.split(' ')
		.map(str => str.toLowerCase())
		.join('-');

const SideBar = ({ nav }) => (
	<nav className="o-layout__navigation">
		<ol>
			{nav.map(({ title, linkText }) => (
				<li>
					<a href={`#${toKebabCase(title)}`}>{linkText || title}</a>
				</li>
			))}
		</ol>
	</nav>
);

const { HeadAssets, TailAssets } = require('./asset-loading');
const { Header } = require('./header');
const { Message } = require('../components/messages');
const { Footer } = require('./footer');

const Layout = props => {
	const assetPaths = getAssetReferences(props.isProduction);
	const { includeFooter = true } = props;
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
					charset="UTF-8"
				/>
				<HeadAssets {...assetPaths} />
			</head>
			<body>
				{props.message ? <Message {...props} isBanner /> : null}
				<div
					className={`o-layout o-layout--${props.layout || 'docs'}`}
					data-o-component="o-layout"
					data-o-layout-nav-heading-selector=".section-heading, .record-title"
				>
					<Header {...props} />

					{props.noSidebar ? null : (
						<div className="o-layout__sidebar">
							{props.sideBarNav ? (
								<SideBar nav={props.sideBarNav} />
							) : null}
						</div>
					)}
					{props.children}
					{includeFooter ? <Footer {...props} /> : null}
				</div>
				<TailAssets {...assetPaths} />
			</body>
		</html>
	);
};

module.exports = Layout;
