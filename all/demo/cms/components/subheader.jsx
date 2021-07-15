const React = require('react');

const newTabLinkProps = url => {
	if (String(url).startsWith('http')) {
		return { rel: 'noopener noreferrer', target: '_blank' };
	}
	return {};
};

const AlternateViewLink = ({ url, ariaLabel, text }) => (
	<>
		<a
			className="o-buttons o-buttons--secondary o-layout__unstyled-element o-buttons-icon o-buttons-icon--arrow-right"
			href={url}
			aria-label={ariaLabel}
			{...newTabLinkProps(url)}
		>
			{text}
		</a>{' '}
	</>
);

const Subheader = ({
	schema: { type },
	data: { code, url, _lockedFields, runbookMdUrl, lastReleaseTimestamp },
	data,
}) => (
	<div className="o-buttons__group">
		{type === 'System' && data.lifecycleStage !== 'Decommissioned' ? (
			<>
				<AlternateViewLink
					url={`https://runbooks.ftops.tech/${encodeURIComponent(
						code,
					)}`}
					ariaLabel={`Edit ${code} in Biz Ops Admin`}
					text="Runbook"
				/>
				<AlternateViewLink
					url={`https://heimdall.in.ft.com/system?code=${encodeURIComponent(
						code,
					)}`}
					ariaLabel={`View the status of ${code} in Heimdall`}
					text="Heimdall dashboard"
				/>

				<AlternateViewLink
					url={`https://sos.in.ft.com/System/${encodeURIComponent(
						code,
					)}`}
					ariaLabel={`See the system operability score for ${code}`}
					text="SOS rating"
				/>
				{lastReleaseTimestamp ? (
					<AlternateViewLink
						url={`https://changes.in.ft.com/?systems=${code}`}
						ariaLabel="View recent change logs for this system"
						text="Changes"
					/>
				) : null}
				{/biz-ops-runbook-md/.test(_lockedFields) ? null : (
					<AlternateViewLink
						url={`https://biz-ops.in.ft.com/runbook.md/export?systemCode=${encodeURIComponent(
							code,
						)}`}
						ariaLabel={`Create a RUNBOOK.md file to maintain this system's information in`}
						text="Create RUNBOOK.md"
					/>
				)}

				{runbookMdUrl ? (
					<AlternateViewLink
						url={runbookMdUrl}
						ariaLabel={`Visit the System's RUNBOOK.md file to edit this system's information`}
						text="Edit RUNBOOK.md"
					/>
				) : null}
			</>
		) : null}
		{type === 'Person' && data.isPeopleApi ? (
			<>
				<AlternateViewLink
					url={`https://people-finder.in.ft.com/search?name=${encodeURIComponent(
						code,
					)}`}
					ariaLabel="More about this staff member in people finder"
					text="People finder"
				/>
				<AlternateViewLink
					url={`https://people-finder.in.ft.com/org/${encodeURIComponent(
						code,
					)}`}
					ariaLabel="View this person's org chart in people-finder"
					text="Org chart"
				/>
			</>
		) : null}
		{type === 'Repository' && data.versionControlSystem === 'github' ? (
			<AlternateViewLink
				url={url}
				ariaLabel="See this repository in Github"
				text="Github"
			/>
		) : null}
		<AlternateViewLink
			url={`/${type}/${encodeURIComponent(code)}/visualise`}
			ariaLabel={`Visualise the connections to ${code}`}
			text="GraphViz"
		/>
	</div>
);

module.exports = { Subheader };
