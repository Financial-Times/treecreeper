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
module.exports = { HeadAssets, TailAssets };
