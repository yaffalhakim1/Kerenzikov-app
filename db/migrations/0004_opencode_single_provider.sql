-- OpenCode was two providers (`openCode` driving the v1 HTTP API, `openCode2`
-- driving the v2 one) until the CLI dropped the v1 routes and the two collapsed
-- into a single provider. The surviving id is `openCode`.
--
-- Both statements are deliberately narrow. A bare `replace(data, 'opencode2',
-- 'openCode')` would corrupt history: `session_details.data` is the whole
-- serialized session, so it also contains the user's transcript, where
-- `opencode2.cmd` and quoted conversation about the two CLIs appear as ordinary
-- prose. Matching the complete JSON member `"provider":"openCode2"` touches the
-- provider field and nothing else.
UPDATE `sessions` SET `provider` = 'openCode' WHERE `provider` = 'openCode2';--> statement-breakpoint
UPDATE `session_details`
SET `data` = replace(`data`, '"provider":"openCode2"', '"provider":"openCode"')
WHERE `data` LIKE '%"provider":"openCode2"%';
