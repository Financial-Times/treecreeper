module.exports = {
	files: {
		allow: [
			'.prettierrc',
			'doc/model.cql',
			'doc/model.grass',
			'scripts/neo4j-plugins',
			'scripts/neo4j-wait-for-start',
			'test/mocha.opts',
			'scripts/load-testing/statsd/statsd.conf'
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
			'E7AdgFBVeAPVMNcKGsHMA', // package-lock.json:41|401|722|1682|1767|2031|7072|7192|7704
			'ts5T58OAqqXaOcCvaI7UF', // package-lock.json:122
			'YU6nrzlmT6hM8N5OUV0SA', // package-lock.json:422
			'\\+MRYDp0oSvlo2IL6rQWA10PQi7tDUM3eqMSltXmY', // package-lock.json:541
			'7N3P3qNtAlv7X0d9bI28w', // package-lock.json:541
			'2eis5WqQGV7peooDyLmNEPUrps9\\+SXX5c9pL3xEB', // package-lock.json:656|1272|1918|7257
			'/hhIC9OoO\\+KLpu9IJTS9j4DRVJ3aDDF9cMSoa2lw', // package-lock.json:673
			'QIZrnhueC1W0gYlDEeaPr', // package-lock.json:687
			'TNPjfTr432qx7yOjQyaXm3dSR0MH9vXp7eT1BFSl', // package-lock.json:737|737
			'qhAVI1\\+Av2X7qelOfAIYwXONood6XlZE/fXaBSmW', // package-lock.json:787
			'WclKAEzWH47lCdplFocUM', // package-lock.json:975
			'\\+if6uywV0nDGoiydJRy4yk7h9od5Og0kxx4zUXmw', // package-lock.json:1082
			'NUqtwOAps4mk2Zob89MWXMHjHWg9milF', // package-lock.json:1111
			'hYD5i0aPN5QwZisEbDStI', // package-lock.json:1191
			'OX8XqP7/1a9cqkxYw2yXss15f26NKWBpDXQd0/uK', // package-lock.json:1209
			'\\+3Uk5DYh6/1eKO0m0YmJFGNmFHGACpf1ClL1nmlV', // package-lock.json:1222
			'\\+C10TsW4PURY/ic\\+eaysnSkwB4kA/mBlCyy/IKDJ', // package-lock.json:1385
			'/1x1EbZB7phzYu7vCr1v3ONuzDtX8WjuM9c0iYxe', // package-lock.json:1498
			'FHyH341ZrbnMUpe\\+5Bocte9xkmFMzPMjRaZMcXww', // package-lock.json:1579
			'xxHRdYnKtcECzVg7xOWhflvJMnqcFZjw', // package-lock.json:1595
			'\\+A9DVCndXfkeFUd3byderg\\+EbDkfnevfCwynWaNA', // package-lock.json:1600
			'A9DVCndXfkeFUd3byderg', // package-lock.json:1600
			'SRUReLS5Q8a7GxtRdxEBVZpm98rJM7Sb', // package-lock.json:1600
			'oTZqweIP51xaGPI4uPa56', // package-lock.json:1775
			'eRzhrN1WSINYCDCbrz796z37LOe3m5tmW7RQf6oBntukAG1nmovJvhnwHHRMAfeoItc1m2Hk02WER2aQ', // package-lock.json:1780
			'zhSCtt8v2NDrRlPQpCNtw', // package-lock.json:1824|2039|7080
			'/6WlbVge9bhM74OpNPQPMGUToDtz\\+KXa1PneJxOA', // package-lock.json:1850|3516
			'YEwgwAXU9cI67NIda0kJk', // package-lock.json:2068
			'Fs9VRguL0gqGHkXS5GQiMCr1VhZBxz0JnJs4JmMp', // package-lock.json:2078|2078
			'5y4gQJQzoGY2YCPdaIekE', // package-lock.json:2590
			'JAzQV4WpoY5WHcG0S0HHY', // package-lock.json:2689
			'rYj24lkinxf69blJbnsvtqqNU\\+L3SL50vzZhXOnw', // package-lock.json:2789
			'PaQqUC9SRmAiSA9CCCYd4', // package-lock.json:2951
			'jVMFbYir2bp6bAj8efFNxWqHX0dIss6fJQ\\+/\\+qeQ', // package-lock.json:2961
			'/\\+\\+YKmP51OdWeGPuqCOba6kk2OTe5d02VmTB80Pw', // package-lock.json:3055
			'wOcfdRHaZ7VWtqCztfHri', // package-lock.json:3055
			'Df2Y9akRFxbdU13aZJL2e', // package-lock.json:3085
			'qgDYXFSR5WvEfuS5dMj6oTMEbrrSaM0CrFk2Yiq/', // package-lock.json:3170
			'/kL\\+oeZqzlYYYLQBwXVBlVzIsZwBqGREnOro24oC', // package-lock.json:3317
			'\\+Nb/6l093lx4OQ0foGWNRoc19mWy7BzL\\+UAK2iVg', // package-lock.json:3346
			'sAqqVW3YtEVoFQ7J0blT8', // package-lock.json:3430
			'whzbngPNPTAhOY2iGycIU', // package-lock.json:3435
			'\\+PjyTTMMeNQC4DZw5AwfvelsUrA6B67NKMqXDbzQ', // package-lock.json:3476
			'QahvxwQZXKygOQ256myeN', // package-lock.json:3476
			'DxoQYYdhKgVAfqVy4pzXRZELHOIewzoesxpjYvpU', // package-lock.json:3663|3663
			'TSfVAu49jYC4BvQ4Sms9SZgdqGBgroqfDhJdTyKQ', // package-lock.json:3693|3693
			'cnS2a5F2x\\+w5ppvTqObojTP7WiFG\\+kVZs9Inw\\+qQ', // package-lock.json:6526
			'PBrfhx6pzWyUMbbqK9dKD', // package-lock.json:6634
			'32BBeABfUi8V60SQ5yR6G', // package-lock.json:6640
			'\\+Z/4UeDaLuSW\\+39JPeFgs4gCGqsrJHVZX0fUrx//', // package-lock.json:6694
			'8ebhBxrqftHWnyTFweJ5Q', // package-lock.json:6771
			'wnvdQcjq9TZjevvXzSUo7bfmw91saqMjzGS2xq91', // package-lock.json:6784|6784
			'LOPw8FpgdQF9etWMaAfG/WRthIdXJGYp4mJ2Jgn/', // package-lock.json:6860
			'TTlYpa\\+OL\\+vMMNG24xSlQGEJ3B/RzEfUlLct7b5G', // package-lock.json:6964
			'wPrplCpVMFuwzXbkecJrb6IYo1iFb0S9v37754mg', // package-lock.json:6964
			'6BctqTVQiBP3YUJ9C6DQOXJmkYR9X9fCLtCOJc5w', // package-lock.json:6969|6969
			'Gd2UZBJDkXlY7GbJxfsE8', // package-lock.json:7010
			'cBBzwBcNDWoFxt2XEFIpQ', // package-lock.json:7124
			'trdx\\+mB0VBBgoYucy6a9L7/jfQOmvGeaKZT4OOJ\\+', // package-lock.json:7147
			'mbKkMdQKsjX4BAL4bRYTj21edOf8cN7XHdYUJEe\\+', // package-lock.json:7269
			'Zn99hVEYcMvKPct1IqNe7', // package-lock.json:7269
			'JGboMidrGRY1Y77ncjiHR', // package-lock.json:7325
			'/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g', // package-lock.json:7330
			'MjqsvNwyz1s0k81Goz/9vRBe9SZdB09Bdw\\+/zYyO', // package-lock.json:7335
			'NrQHlS/V/qgv763EYudVwEcMQNxd2lh\\+0VrUByXN', // package-lock.json:7369
			'9serjQBIztjRz6FkJez9D/hleyAXTBGLwwZUw9lA', // package-lock.json:7621
			'9serjQBIztjRz6FkJez9D', // package-lock.json:7621
			'7iAgiMkLhSbaZxUqmrprw', // package-lock.json:7800
			'YTdrdZheS8TFwvkbLWf/G5KNJDCh6pKL5OZctEW4', // package-lock.json:7822
			'evKGRg15UJHGB9X5j5Z3AFbgZvjUh2yq', // package-lock.json:7866
			'LbqTKRAQ5kw8A90rA6fr4riOUpTZvQZA', // package-lock.json:7884
			'eEQ97k66aiEVpNnapVj90', // package-lock.json:7904
			'j4tCjkF/n89iBNGBMJcR\\+dMUqxgPNgoSs6fVygPi', // package-lock.json:7925
			'getNeo4jResolverNames' // schema/index.js:30|45, server/graphql/resolvers.js:4|8
		]
	}
};
