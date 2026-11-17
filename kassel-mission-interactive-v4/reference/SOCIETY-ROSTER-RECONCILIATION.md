# Society roster reconciliation, 1 October 2026

Read-only Webflow snapshots preserve 35 crew records and 339 participant records. Staged drafts are explicitly flagged. No CMS writes or publishing were performed.

The simulation contains 35 crews and 336 mission participants. The three apparent additional CMS participants are not three missing airmen:

- John A. Friese is marked not in mission.
- William Brown is marked not in mission; his reciprocal crew link also differs.
- Wayne Sprague is already represented elsewhere in the local roster. The Schaen crew multi-reference points to him, but his participant record points to a different crew. Do not duplicate him into Schaen without documentary resolution.

Run `node audit-society-roster.js` to reproduce the reference-link audit. This checks identity membership, not complete historical correctness or station assignments.

Miner's crew narrative explicitly describes Virgil Chima bailing out and landing in forest. The previous outcome-label filter omitted him because he was KIA. The runtime now includes him among depicted bailouts, alongside the already included assisted bailout of Joseph Gilfoil. Automated tests check both are included and Miner remains last. Exact exit chronology, canopy deployment and fatal mechanisms have not been established by this CMS narrative. Do not infer them from the KIA designation.

The runtime still uses estimated bailout times and trajectories; the new inclusion is not empirical aerodynamic validation. Interior reconstruction, metric scene integration, individualized exit geometry and full battle browser verification remain outstanding.
