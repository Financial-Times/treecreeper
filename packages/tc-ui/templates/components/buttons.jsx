const { h } = require('preact');

const coreClasses = 'o-buttons o-buttons--big biz-ops-cta';

const getButtonClasses = extraClasses =>
	extraClasses ? `${coreClasses} ${extraClasses}` : coreClasses;

const EditButton = props => (
	<a
		href={`/${props.type}/${encodeURIComponent(props.code)}/edit?${
			props.querystring
		}`}
		className={getButtonClasses(
			'o-buttons--primary o-buttons--mono biz-ops-cta--link-style-override',
		)}
	>
		Edit
	</a>
);

const SaveButton = () => (
	<button
		className={getButtonClasses('o-buttons--primary o-buttons--mono')}
		type="submit"
	>
		Save
	</button>
);

const CancelButton = props => {
	const redirectLocation =
		props.type && props.code
			? `/${props.type}/${encodeURIComponent(props.code)}?${
					props.querystring
			  }`
			: `/create`;

	return (
		<a
			href={redirectLocation}
			className={getButtonClasses(
				'o-buttons--mono biz-ops-cta--link-style-override',
			)}
		>
			Cancel
		</a>
	);
};

const DeleteButton = props =>
	props.querystring ? null : (
		<form
			action={`/${props.type}/${encodeURIComponent(props.code)}/delete`}
			className="biz-ops-cta"
			method="POST"
		>
			<button
				className={getButtonClasses(
					'o-buttons--mono biz-ops-cta--delete',
				)}
				type="submit"
			>
				Delete
			</button>
		</form>
	);

const VisualiseButton = props =>
	props.querystring ? null : (
		<form
			action={`/${props.type}/${encodeURIComponent(
				props.code,
			)}/visualise`}
			className="biz-ops-cta"
			method="GET"
		>
			<button
				className={getButtonClasses(
					'o-buttons--mono biz-ops-cta--visualise',
				)}
				type="submit"
			>
				Visualise
			</button>
		</form>
	);

module.exports = {
	EditButton,
	SaveButton,
	CancelButton,
	DeleteButton,
	VisualiseButton,
};
