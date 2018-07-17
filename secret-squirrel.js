module.exports = {
	files: {
		allow: [
			'.prettierrc',
			'doc/model.cql',
			'doc/model.grass',
			'scripts/neo4j-plugins',
			'scripts/neo4j-wait-for-start',
			'test/mocha.opts'
		],
		allowOverrides: []
	},
	strings: {
		deny: [],
		denyOverrides: [
			'bf2e19d8-7601-11e8-864d-61e3701df193', // README.md:4
			'32e6ad1a-210f-11e8-89cc-978cb917c4e7', // doc/MODEL.md:5
			'396e2a98-1d16-11e8-87fd-7f7eb4f8a221', // doc/MODEL.md:11
			'33cba7fc-1d19-11e8-8417-7c85b306fa17', // doc/MODEL.md:21
			'E7AdgFBVeAPVMNcKGsHMA', // package-lock.json:158|538|873|1853|1938|2203|6751|6872|7406
			'ts5T58OAqqXaOcCvaI7UF', // package-lock.json:247
			'Y9Ssr2b0bFr9pBRsXy9eudPhI\\+/O4yqegSUsnLdF', // package-lock.json:334
			'kx4hcvO3TTDFQ9CuTprtzdcVyA11iqG7iOMOt7vA', // package-lock.json:343|343
			'YU6nrzlmT6hM8N5OUV0SA', // package-lock.json:562
			'\\+MRYDp0oSvlo2IL6rQWA10PQi7tDUM3eqMSltXmY', // package-lock.json:688
			'7N3P3qNtAlv7X0d9bI28w', // package-lock.json:688
			'2eis5WqQGV7peooDyLmNEPUrps9\\+SXX5c9pL3xEB', // package-lock.json:804|1434|2089|6937
			'/hhIC9OoO\\+KLpu9IJTS9j4DRVJ3aDDF9cMSoa2lw', // package-lock.json:822
			'QIZrnhueC1W0gYlDEeaPr', // package-lock.json:836
			'TNPjfTr432qx7yOjQyaXm3dSR0MH9vXp7eT1BFSl', // package-lock.json:889|889
			'qhAVI1\\+Av2X7qelOfAIYwXONood6XlZE/fXaBSmW', // package-lock.json:939
			'WclKAEzWH47lCdplFocUM', // package-lock.json:1129
			'\\+if6uywV0nDGoiydJRy4yk7h9od5Og0kxx4zUXmw', // package-lock.json:1240
			'NUqtwOAps4mk2Zob89MWXMHjHWg9milF', // package-lock.json:1269
			'hYD5i0aPN5QwZisEbDStI', // package-lock.json:1352
			'OX8XqP7/1a9cqkxYw2yXss15f26NKWBpDXQd0/uK', // package-lock.json:1370
			'\\+3Uk5DYh6/1eKO0m0YmJFGNmFHGACpf1ClL1nmlV', // package-lock.json:1383
			'\\+C10TsW4PURY/ic\\+eaysnSkwB4kA/mBlCyy/IKDJ', // package-lock.json:1552
			'CqY0fNae93ZHTd20snh9ZLr8mTzIL9m0APQ1pjQg', // package-lock.json:1560|1560
			'/1x1EbZB7phzYu7vCr1v3ONuzDtX8WjuM9c0iYxe', // package-lock.json:1669
			'FHyH341ZrbnMUpe\\+5Bocte9xkmFMzPMjRaZMcXww', // package-lock.json:1750
			'xxHRdYnKtcECzVg7xOWhflvJMnqcFZjw', // package-lock.json:1766
			'\\+A9DVCndXfkeFUd3byderg\\+EbDkfnevfCwynWaNA', // package-lock.json:1771
			'A9DVCndXfkeFUd3byderg', // package-lock.json:1771
			'SRUReLS5Q8a7GxtRdxEBVZpm98rJM7Sb', // package-lock.json:1771
			'oTZqweIP51xaGPI4uPa56', // package-lock.json:1946
			'eRzhrN1WSINYCDCbrz796z37LOe3m5tmW7RQf6oBntukAG1nmovJvhnwHHRMAfeoItc1m2Hk02WER2aQ', // package-lock.json:1951
			'zhSCtt8v2NDrRlPQpCNtw', // package-lock.json:1995|2211|6759
			'/TmU\\+\\+01ANae4BAjBT\\+Dbr9k929OV1EFkuSOsACA', // package-lock.json:2002
			'Dbr9k929OV1EFkuSOsACA', // package-lock.json:2002
			'/6WlbVge9bhM74OpNPQPMGUToDtz\\+KXa1PneJxOA', // package-lock.json:2021|3748
			'YEwgwAXU9cI67NIda0kJk', // package-lock.json:2240
			'Fs9VRguL0gqGHkXS5GQiMCr1VhZBxz0JnJs4JmMp', // package-lock.json:2250|2250
			'5y4gQJQzoGY2YCPdaIekE', // package-lock.json:2762
			'JAzQV4WpoY5WHcG0S0HHY', // package-lock.json:2861
			'rYj24lkinxf69blJbnsvtqqNU\\+L3SL50vzZhXOnw', // package-lock.json:2964
			'PaQqUC9SRmAiSA9CCCYd4', // package-lock.json:3131
			'jVMFbYir2bp6bAj8efFNxWqHX0dIss6fJQ\\+/\\+qeQ', // package-lock.json:3141
			'phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns', // package-lock.json:3163
			'/\\+\\+YKmP51OdWeGPuqCOba6kk2OTe5d02VmTB80Pw', // package-lock.json:3244
			'wOcfdRHaZ7VWtqCztfHri', // package-lock.json:3244
			'Df2Y9akRFxbdU13aZJL2e', // package-lock.json:3274
			'qgDYXFSR5WvEfuS5dMj6oTMEbrrSaM0CrFk2Yiq/', // package-lock.json:3359
			'h9Vg3nfbxrF0PK0kZiNiMAyL8zXaLiBP', // package-lock.json:3432
			'/kL\\+oeZqzlYYYLQBwXVBlVzIsZwBqGREnOro24oC', // package-lock.json:3536
			'\\+Nb/6l093lx4OQ0foGWNRoc19mWy7BzL\\+UAK2iVg', // package-lock.json:3565
			'sAqqVW3YtEVoFQ7J0blT8', // package-lock.json:3660
			'whzbngPNPTAhOY2iGycIU', // package-lock.json:3665
			'\\+PjyTTMMeNQC4DZw5AwfvelsUrA6B67NKMqXDbzQ', // package-lock.json:3707
			'QahvxwQZXKygOQ256myeN', // package-lock.json:3707
			'DxoQYYdhKgVAfqVy4pzXRZELHOIewzoesxpjYvpU', // package-lock.json:3906|3906
			'TSfVAu49jYC4BvQ4Sms9SZgdqGBgroqfDhJdTyKQ', // package-lock.json:3936|3936
			'cnS2a5F2x\\+w5ppvTqObojTP7WiFG\\+kVZs9Inw\\+qQ', // package-lock.json:6195
			'PBrfhx6pzWyUMbbqK9dKD', // package-lock.json:6309
			'32BBeABfUi8V60SQ5yR6G', // package-lock.json:6315
			'\\+Z/4UeDaLuSW\\+39JPeFgs4gCGqsrJHVZX0fUrx//', // package-lock.json:6370
			'8ebhBxrqftHWnyTFweJ5Q', // package-lock.json:6448
			'wnvdQcjq9TZjevvXzSUo7bfmw91saqMjzGS2xq91', // package-lock.json:6461|6461
			'LOPw8FpgdQF9etWMaAfG/WRthIdXJGYp4mJ2Jgn/', // package-lock.json:6537
			'TTlYpa\\+OL\\+vMMNG24xSlQGEJ3B/RzEfUlLct7b5G', // package-lock.json:6642
			'wPrplCpVMFuwzXbkecJrb6IYo1iFb0S9v37754mg', // package-lock.json:6642
			'6BctqTVQiBP3YUJ9C6DQOXJmkYR9X9fCLtCOJc5w', // package-lock.json:6647|6647
			'Gd2UZBJDkXlY7GbJxfsE8', // package-lock.json:6689
			'cBBzwBcNDWoFxt2XEFIpQ', // package-lock.json:6803
			'mbKkMdQKsjX4BAL4bRYTj21edOf8cN7XHdYUJEe\\+', // package-lock.json:6949
			'Zn99hVEYcMvKPct1IqNe7', // package-lock.json:6949
			'JGboMidrGRY1Y77ncjiHR', // package-lock.json:7008
			'/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g', // package-lock.json:7014
			'MjqsvNwyz1s0k81Goz/9vRBe9SZdB09Bdw\\+/zYyO', // package-lock.json:7019
			'NrQHlS/V/qgv763EYudVwEcMQNxd2lh\\+0VrUByXN', // package-lock.json:7053
			'9serjQBIztjRz6FkJez9D/hleyAXTBGLwwZUw9lA', // package-lock.json:7314
			'9serjQBIztjRz6FkJez9D', // package-lock.json:7314
			'7iAgiMkLhSbaZxUqmrprw', // package-lock.json:7502
			'YTdrdZheS8TFwvkbLWf/G5KNJDCh6pKL5OZctEW4', // package-lock.json:7524
			'cwESVXlO3url9YWlFW/TA9cshCEhtu7IKJ/p5soJ', // package-lock.json:7568
			'LbqTKRAQ5kw8A90rA6fr4riOUpTZvQZA', // package-lock.json:7583
			'eEQ97k66aiEVpNnapVj90', // package-lock.json:7603
			'j4tCjkF/n89iBNGBMJcR\\+dMUqxgPNgoSs6fVygPi', // package-lock.json:7624
			'getNeo4jResolverNames' // schema/index.js:30|45, server/graphql/resolvers.js:4|8
		]
	}
};
