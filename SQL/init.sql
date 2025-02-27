--Insert Descriptions
INSERT INTO descriptions (id, name, icon, tooltip, color) VALUES
(1, 'romantic'		, 'mdi-heart-pulse'		,  'Romantic'	,  'pink'			),
(2, 'athletic'		, 'mdi-run'				,  'Athletic'	,  'green'			),
(3, 'shy'			, 'mdi-paw'				,  'Shy'		,  'blue-lighten-1'	),
(4, 'excentric'		, 'mdi-bell-ring-outline', 'Excentric'	,  'purple'			),
(5, 'horny'			, 'mdi-duck'			,  'Horny'		,  'red'			),
(6, 'couch potato'	, 'mdi-sofa'			,  'Couch Potato', 'deep-purple'	),
(7, 'happy'			, 'mdi-emoticon-happy'	,  'Happy!'		,  'blue'			),
(8, 'sad'			, 'mdi-emoticon-sad'	,  'Sad!'		,  'amber'			);

--Insert Genders
INSERT INTO genders (id, name) VALUES
(1, 'Male'),
(2, 'Female'),
(3, 'Other');

--Insert Interests
INSERT INTO looking_for (id, name, icon, tooltip, color) VALUES
(1, 'Love'				, 'mdi-heart-search'			, 'Love, baby!'			, 'red'		),
(2, 'Fun'				, 'mdi-fire-extinguisher'		, 'Just some fun!'		, 'blue'	),
(3, 'Nothing Serious'	, 'mdi-coffee-outline'			, 'Oh, Nothing Serious'	, 'green'	),
(4, 'Men'				, 'mdi-gender-male'				, 'Men!'				, 'blue'	),
(5, 'Women'				, 'mdi-gender-female'			, 'Women!'				, 'pink'	),
(6, 'Friends'			, 'mdi-account-multiple-outline', 'Just Friends'		, 'orange'	);

--Insert Sex
INSERT INTO sex (id, gender) VALUES
(1, 'Male'	),
(2, 'Female'),
(3, 'Other'	);

INSERT INTO status (id, created_at, name, icon) VALUES
(1, NOW(), 'Single'				, 'mdi-account'			),
(2, NOW(), 'Married'			, 'mdi-account-multiple'),
(3, NOW(), 'It''s Complicated'	, 'mdi-account-convert'	),
(4, NOW(), 'Separated'			, 'mdi-account-minus'	),
(5, NOW(), 'Other'				, 'mdi-airballoon'		);
