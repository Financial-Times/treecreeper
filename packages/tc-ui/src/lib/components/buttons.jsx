const React = require('react');

const coreClasses = 'o-buttons o-buttons--big biz-ops-cta';

const getButtonClasses = extraClasses =>
	extraClasses ? `${coreClasses} ${extraClasses}` : coreClasses;

const EditButton = props => (
	<a
		data-button-type="edit"
		href={`/${props.type}/${encodeURIComponent(props.code)}/edit?${
			props.querystring
		}`}
		className={getButtonClasses('o-buttons--primary o-buttons--mono')}
	>
		Edit
	</a>
);

const SaveButton = () => (
	<button
		data-button-type="submit"
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
			data-button-type="cancel"
			href={redirectLocation}
			className={getButtonClasses(
				'o-buttons--secondary o-buttons--mono biz-ops-cta--link-style-override',
			)}
		>
			Cancel
		</a>
	);
};

const DeleteButton = props =>
	props.isSubset ? null : (
		<form
			action={`/${props.type}/${encodeURIComponent(props.code)}/delete`}
			className="biz-ops-cta"
			method="POST"
		>
			<button
				data-button-type="delete"
				className={getButtonClasses(
					'o-buttons--mono biz-ops-cta--link-style-override biz-ops-cta--delete',
				)}
				type="submit"
			>
				Delete
			</button>
		</form>
	);

module.exports = {
	EditButton,
	SaveButton,
	CancelButton,
	DeleteButton,
};
