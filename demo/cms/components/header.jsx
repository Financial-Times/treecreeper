const React = require('react');
const { Message } = require('./messages');

const siteTitle = 'Biz Ops';

const newTabLinkProps = url => {
	if (String(url).startsWith('http')) {
		return { rel: 'noopener noreferrer', target: '_blank' };
	}
	return {};
};

const userLinks = [
	{
		url: 'https://runbooks.ftops.tech',
		text: 'Looking for runbooks?',
	},
	{
		url: 'https://financialtimes.slack.com/messages/C07B3043U',
		text: 'Feedback/bug reports',
	},
];

const UserLink = ({ url, text }) => (
	<li>
		<a href={url} {...newTabLinkProps(url)}>
			{text}
		</a>
	</li>
);

const DropdownLink = ({ text, url }) => (
	<li>
		<a href={url} {...newTabLinkProps(url)}>
			{text}
		</a>
	</li>
);

const PrimaryNavItem = ({ isActive, text, url, items }) => (
	<li data-o-header-services-level={items ? 1 : null}>
		<a
			aria-current={isActive ? 'true' : ''}
			href={url}
			{...newTabLinkProps(url)}
		>
			{items ? text : <div>{text}</div>}
		</a>
		{items ? (
			<>
				<button
					className="o-header-services__drop-down-button"
					type="button"
					name="button"
					aria-label="Toggle dropdown menu"
				/>
				<ul data-o-header-services-level="2" aria-hidden="true">
					{items.map(DropdownLink)}
					<button
						className="o-header-services__visually-hidden"
						type="button"
						name="button"
					>
						Close dropdown menu
					</button>
				</ul>
			</>
		) : null}
	</li>
);

const SearchBar = () => (
	<li>
		<form
			id="headerSearchForm"
			action="/search"
			method="GET"
			className="header-search-form o-forms--input o-forms-input--text  o-forms-input--suffix o-forms-input--small"
		>
			<input
				type="text"
				name="q"
				id="search-input"
				placeholder="Search Biz Ops data"
			/>
			<button type="submit" className="o-buttons o-buttons--primary">
				Search
			</button>
		</form>
	</li>
);

const getPrimaryNavItems = ({ activeNavItem }) =>
	[
		{
			id: 'create',
			text: 'Add something',
			url: '/create',
			items: [
				{ text: 'Product', url: '/Product/create' },
				{ text: 'System', url: '/System/create' },
				{ text: 'Team', url: '/Team/create' },
				{ text: 'Something else', url: '/create' },
			],
		},
		{
			id: 'browse',
			text: 'Browse',
			url: '/browse',
			items: [
				{ text: 'Product list', url: '/list/Products' },
				{ text: 'System list', url: '/list/Systems' },
				{ text: 'Group list', url: '/list/Groups' },
				{ text: 'Team list', url: '/list/Teams' },
				{
					text: 'Platinum Systems',
					url:
						'/list/Systems?title=Platinum Systems&serviceTier=Platinum&lifecycleStage=Production&extras=deliveredBy,supportedBy,sosTrafficLight',
				},
			],
		},
		{
			id: 'api',
			text: 'API',
			url: '/api-explorer',
			items: [
				{ text: 'API Explorer', url: '/api-explorer' },
				{
					text: 'API documentation',
					url: 'https://github.com/Financial-Times/biz-ops-api#api',
				},
			],
		},
		{
			id: 'tools',
			text: 'Tools',
			url: '#',
			items: [
				{ text: 'Runbook.md', url: '/runbook.md' },
				{ id: 'report', text: 'Report (beta)', url: '/report' },
				{ text: 'SOS reports', url: 'https://sos.in.ft.com' },
				{
					text: 'OKR Overview',
					url: 'https://okr-overview.in.ft.com/',
				},
				{ text: 'API Dashboard', url: 'https://apis.in.ft.com/' },
			],
		},
		{
			id: 'reports',
			text: 'Reports',
			url: '#',
			items: [
				{
					text: 'Decommissioned Systems',
					url:
						'/list/Systems?title=Decommissioned Systems&lifecycleStage=Decommissioned',
				},
				{
					text: 'Discontinued Systems',
					url:
						'/list/Systems?title=Discontinued Systems&lifecycleStage=Discontinued',
				},
				{
					text: 'Deprecated Systems',
					url:
						'/list/Systems?title=Deprecated Systems&lifecycleStage=Deprecated',
				},
				{
					text: 'Inactive Teams',
					url: '/list/Teams?title=Inactive Teams&isActive=!true',
				},

				{
					text: 'Unowned Systems',
					url:
						'/list/Systems?title=Unowned Systems&deliveredBy=null&supportedBy=null&lifecycleStage=!Decommissioned&extras=deliveredBy,supportedBy',
				},
				{
					text: 'Unsupported Systems',
					url:
						'/list/Systems?title=Unsupported Systems&serviceTier=Unsupported&lifecycleStage=!Decommissioned&extras=deliveredBy,supportedBy',
				},
				{
					text: 'Undefined Systems',
					url: `/list/Systems?title=Undefined Systems&filter=${encodeURIComponent(
						'{OR:[{name:null,description:null,hostPlatform:null,lifecycleStage:null,serviceTier:null}]}',
					)}&extras=deliveredBy,supportedBy`,
				},
			],
		},
		{ id: 'about', text: 'About', url: '/about' },
	]
		.filter(item => !!item)
		.map(item => {
			item.isActive = item.id === activeNavItem;
			return item;
		});

const Header = props => {
	const primaryNav = getPrimaryNavItems(props);
	return (
		<>
			<div className="o-layout__header">
				<header
					className="o-header-services"
					data-o-component="o-header-services"
				>
					<div className="o-header-services__top">
						<div className="o-header-services__hamburger">
							<a
								className="o-header-services__hamburger-icon"
								href="#o-header-drawer"
								role="button"
							>
								<span className="o-header-services__visually-hidden">
									Menu
								</span>
							</a>
						</div>
						<div className="o-header-services__logo" />
						<div className="o-header-services__title">
							<div className="o-header-services__product-name">
								{/* <h1 class='o-header-services__product-name'><a href=''>Tool or Service name</a></h1> */}
								<a href="/">{siteTitle}</a>
							</div>
						</div>

						<ul className="o-header-services__related-content">
							{userLinks.map(UserLink)}
							<SearchBar />
						</ul>
					</div>

					<nav className="o-header-services__primary-nav">
						<ul className="o-header-services__primary-nav-list">
							{primaryNav.map(navProps => (
								<PrimaryNavItem {...navProps} />
							))}
						</ul>
					</nav>
				</header>
				{props.message ? <Message {...props} isBanner /> : null}
			</div>
		</>
	);
};
module.exports = { Header };
