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
			'E7AdgFBVeAPVMNcKGsHMA', // package-lock.json:158|538|873|1853|1938|2208|6761|6882|7416
			'ts5T58OAqqXaOcCvaI7UF', // package-lock.json:247
			'Y9Ssr2b0bFr9pBRsXy9eudPhI\\+/O4yqegSUsnLdF', // package-lock.json:334
			'kx4hcvO3TTDFQ9CuTprtzdcVyA11iqG7iOMOt7vA', // package-lock.json:343|343
			'YU6nrzlmT6hM8N5OUV0SA', // package-lock.json:562
			'\\+MRYDp0oSvlo2IL6rQWA10PQi7tDUM3eqMSltXmY', // package-lock.json:688
			'7N3P3qNtAlv7X0d9bI28w', // package-lock.json:688
			'2eis5WqQGV7peooDyLmNEPUrps9\\+SXX5c9pL3xEB', // package-lock.json:804|1434|2089|6947
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
			'zhSCtt8v2NDrRlPQpCNtw', // package-lock.json:1995|2216|6769
			'/TmU\\+\\+01ANae4BAjBT\\+Dbr9k929OV1EFkuSOsACA', // package-lock.json:2002
			'Dbr9k929OV1EFkuSOsACA', // package-lock.json:2002
			'/6WlbVge9bhM74OpNPQPMGUToDtz\\+KXa1PneJxOA', // package-lock.json:2021|3758
			'YEwgwAXU9cI67NIda0kJk', // package-lock.json:2245
			'Fs9VRguL0gqGHkXS5GQiMCr1VhZBxz0JnJs4JmMp', // package-lock.json:2255|2255
			'5y4gQJQzoGY2YCPdaIekE', // package-lock.json:2772
			'JAzQV4WpoY5WHcG0S0HHY', // package-lock.json:2871
			'rYj24lkinxf69blJbnsvtqqNU\\+L3SL50vzZhXOnw', // package-lock.json:2974
			'PaQqUC9SRmAiSA9CCCYd4', // package-lock.json:3141
			'jVMFbYir2bp6bAj8efFNxWqHX0dIss6fJQ\\+/\\+qeQ', // package-lock.json:3151
			'phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns', // package-lock.json:3173
			'/\\+\\+YKmP51OdWeGPuqCOba6kk2OTe5d02VmTB80Pw', // package-lock.json:3254
			'wOcfdRHaZ7VWtqCztfHri', // package-lock.json:3254
			'Df2Y9akRFxbdU13aZJL2e', // package-lock.json:3284
			'qgDYXFSR5WvEfuS5dMj6oTMEbrrSaM0CrFk2Yiq/', // package-lock.json:3369
			'h9Vg3nfbxrF0PK0kZiNiMAyL8zXaLiBP', // package-lock.json:3442
			'/kL\\+oeZqzlYYYLQBwXVBlVzIsZwBqGREnOro24oC', // package-lock.json:3546
			'\\+Nb/6l093lx4OQ0foGWNRoc19mWy7BzL\\+UAK2iVg', // package-lock.json:3575
			'sAqqVW3YtEVoFQ7J0blT8', // package-lock.json:3670
			'whzbngPNPTAhOY2iGycIU', // package-lock.json:3675
			'\\+PjyTTMMeNQC4DZw5AwfvelsUrA6B67NKMqXDbzQ', // package-lock.json:3717
			'QahvxwQZXKygOQ256myeN', // package-lock.json:3717
			'DxoQYYdhKgVAfqVy4pzXRZELHOIewzoesxpjYvpU', // package-lock.json:3916|3916
			'TSfVAu49jYC4BvQ4Sms9SZgdqGBgroqfDhJdTyKQ', // package-lock.json:3946|3946
			'cnS2a5F2x\\+w5ppvTqObojTP7WiFG\\+kVZs9Inw\\+qQ', // package-lock.json:6205
			'PBrfhx6pzWyUMbbqK9dKD', // package-lock.json:6319
			'32BBeABfUi8V60SQ5yR6G', // package-lock.json:6325
			'\\+Z/4UeDaLuSW\\+39JPeFgs4gCGqsrJHVZX0fUrx//', // package-lock.json:6380
			'8ebhBxrqftHWnyTFweJ5Q', // package-lock.json:6458
			'wnvdQcjq9TZjevvXzSUo7bfmw91saqMjzGS2xq91', // package-lock.json:6471|6471
			'LOPw8FpgdQF9etWMaAfG/WRthIdXJGYp4mJ2Jgn/', // package-lock.json:6547
			'TTlYpa\\+OL\\+vMMNG24xSlQGEJ3B/RzEfUlLct7b5G', // package-lock.json:6652
			'wPrplCpVMFuwzXbkecJrb6IYo1iFb0S9v37754mg', // package-lock.json:6652
			'6BctqTVQiBP3YUJ9C6DQOXJmkYR9X9fCLtCOJc5w', // package-lock.json:6657|6657
			'Gd2UZBJDkXlY7GbJxfsE8', // package-lock.json:6699
			'cBBzwBcNDWoFxt2XEFIpQ', // package-lock.json:6813
			'mbKkMdQKsjX4BAL4bRYTj21edOf8cN7XHdYUJEe\\+', // package-lock.json:6959
			'Zn99hVEYcMvKPct1IqNe7', // package-lock.json:6959
			'JGboMidrGRY1Y77ncjiHR', // package-lock.json:7018
			'/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g', // package-lock.json:7024
			'MjqsvNwyz1s0k81Goz/9vRBe9SZdB09Bdw\\+/zYyO', // package-lock.json:7029
			'NrQHlS/V/qgv763EYudVwEcMQNxd2lh\\+0VrUByXN', // package-lock.json:7063
			'9serjQBIztjRz6FkJez9D/hleyAXTBGLwwZUw9lA', // package-lock.json:7324
			'9serjQBIztjRz6FkJez9D', // package-lock.json:7324
			'7iAgiMkLhSbaZxUqmrprw', // package-lock.json:7512
			'YTdrdZheS8TFwvkbLWf/G5KNJDCh6pKL5OZctEW4', // package-lock.json:7534
			'cwESVXlO3url9YWlFW/TA9cshCEhtu7IKJ/p5soJ', // package-lock.json:7578
			'LbqTKRAQ5kw8A90rA6fr4riOUpTZvQZA', // package-lock.json:7593
			'eEQ97k66aiEVpNnapVj90', // package-lock.json:7613
			'j4tCjkF/n89iBNGBMJcR\\+dMUqxgPNgoSs6fVygPi', // package-lock.json:7634
			'getNeo4jResolverNames' // schema/index.js:30|45, server/graphql/resolvers.js:4|8
		]
	}
};
