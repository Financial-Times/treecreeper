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
			'OX8XqP7/1a9cqkxYw2yXss15f26NKWBpDXQd0/uK', // package-lock.json:42|1587|1735|4088|4293|8049|8071|8355
			'\\+\\+wLYcrP\\+ZK7Zhb63olXZQO8Kb1oSv1Vvpm10yG0', // package-lock.json:63
			'm3hH17zgkgADUSi2RR1Vht6wOZ0jyHP8rjiQra9f', // package-lock.json:102|102
			'rgX94YeTcTMv/LFJUSByRpc\\+i4GgVnnhLxvMu/2Y', // package-lock.json:129
			'ts5T58OAqqXaOcCvaI7UF', // package-lock.json:152
			'Y9Ssr2b0bFr9pBRsXy9eudPhI\\+/O4yqegSUsnLdF', // package-lock.json:251
			'kx4hcvO3TTDFQ9CuTprtzdcVyA11iqG7iOMOt7vA', // package-lock.json:260|260
			'Ud1SAKKHaHPDMxU8rPoY1jY/sEThmI2riexs7V7/', // package-lock.json:378
			'kyEyQEagBC5mBEFlIYvdg', // package-lock.json:467
			'2eis5WqQGV7peooDyLmNEPUrps9\\+SXX5c9pL3xEB', // package-lock.json:626|1379|2185|7994
			'/hhIC9OoO\\+KLpu9IJTS9j4DRVJ3aDDF9cMSoa2lw', // package-lock.json:645
			'QIZrnhueC1W0gYlDEeaPr', // package-lock.json:659
			'TNPjfTr432qx7yOjQyaXm3dSR0MH9vXp7eT1BFSl', // package-lock.json:724|724
			'ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow', // package-lock.json:759|759|1753|1753|3361|3361|3876|3876|4302|4302|7195|7195|7888|7888|8416|8416|8756|8756
			'qhAVI1\\+Av2X7qelOfAIYwXONood6XlZE/fXaBSmW', // package-lock.json:808
			'/5L0HNZzGQo4fuSPnK\\+wjfPnKZV0aiJDgzmWqqkV', // package-lock.json:878
			'wjfPnKZV0aiJDgzmWqqkV', // package-lock.json:878
			'WclKAEzWH47lCdplFocUM', // package-lock.json:1034
			'\\+if6uywV0nDGoiydJRy4yk7h9od5Og0kxx4zUXmw', // package-lock.json:1162
			'NUqtwOAps4mk2Zob89MWXMHjHWg9milF', // package-lock.json:1205
			'hYD5i0aPN5QwZisEbDStI', // package-lock.json:1292
			'E7AdgFBVeAPVMNcKGsHMA', // package-lock.json:1310
			'\\+3Uk5DYh6/1eKO0m0YmJFGNmFHGACpf1ClL1nmlV', // package-lock.json:1324
			'\\+C10TsW4PURY/ic\\+eaysnSkwB4kA/mBlCyy/IKDJ', // package-lock.json:1498
			'CqY0fNae93ZHTd20snh9ZLr8mTzIL9m0APQ1pjQg', // package-lock.json:1507|1507
			'/1x1EbZB7phzYu7vCr1v3ONuzDtX8WjuM9c0iYxe', // package-lock.json:1663
			'\\+uITPY0989iXVfKvhwtmJocTaYoc/3khEHmEmvfY', // package-lock.json:1789
			'FHyH341ZrbnMUpe\\+5Bocte9xkmFMzPMjRaZMcXww', // package-lock.json:1807
			'SVeJBDM/gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB', // package-lock.json:1823
			'gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB', // package-lock.json:1823
			'\\+A9DVCndXfkeFUd3byderg\\+EbDkfnevfCwynWaNA', // package-lock.json:1828
			'A9DVCndXfkeFUd3byderg', // package-lock.json:1828
			'SRUReLS5Q8a7GxtRdxEBVZpm98rJM7Sb', // package-lock.json:1828
			'oTZqweIP51xaGPI4uPa56', // package-lock.json:2024
			'eRzhrN1WSINYCDCbrz796z37LOe3m5tmW7RQf6oBntukAG1nmovJvhnwHHRMAfeoItc1m2Hk02WER2aQ', // package-lock.json:2029
			'zhSCtt8v2NDrRlPQpCNtw', // package-lock.json:2073|2308|7798
			'/TmU\\+\\+01ANae4BAjBT\\+Dbr9k929OV1EFkuSOsACA', // package-lock.json:2080
			'Dbr9k929OV1EFkuSOsACA', // package-lock.json:2080
			'/6WlbVge9bhM74OpNPQPMGUToDtz\\+KXa1PneJxOA', // package-lock.json:2100|4044
			'YEwgwAXU9cI67NIda0kJk', // package-lock.json:2338
			'Fs9VRguL0gqGHkXS5GQiMCr1VhZBxz0JnJs4JmMp', // package-lock.json:2348|2348
			'5y4gQJQzoGY2YCPdaIekE', // package-lock.json:2928
			'UJDfi6B5p3sHeWIQ0KGIU0Jpxi5ZHxemQfLkkAwQ', // package-lock.json:2960|2960
			'JAzQV4WpoY5WHcG0S0HHY', // package-lock.json:3031
			'\\+Q/GWH5wIG60bpt8CTwBklCSzQdEHmRUgAdEQKxw', // package-lock.json:3086
			'rYj24lkinxf69blJbnsvtqqNU\\+L3SL50vzZhXOnw', // package-lock.json:3127
			'gUbWqG4dIpJedwwOhe1cvGUq5tGmcTTIRkPiAbyh', // package-lock.json:3208|3208
			'PaQqUC9SRmAiSA9CCCYd4', // package-lock.json:3293
			'jVMFbYir2bp6bAj8efFNxWqHX0dIss6fJQ\\+/\\+qeQ', // package-lock.json:3304
			'/\\+\\+YKmP51OdWeGPuqCOba6kk2OTe5d02VmTB80Pw', // package-lock.json:3452
			'wOcfdRHaZ7VWtqCztfHri', // package-lock.json:3452
			'Df2Y9akRFxbdU13aZJL2e', // package-lock.json:3487
			'qgDYXFSR5WvEfuS5dMj6oTMEbrrSaM0CrFk2Yiq/', // package-lock.json:3580
			'\\+Nb/6l093lx4OQ0foGWNRoc19mWy7BzL\\+UAK2iVg', // package-lock.json:3825
			'sAqqVW3YtEVoFQ7J0blT8', // package-lock.json:3954
			'whzbngPNPTAhOY2iGycIU', // package-lock.json:3959
			'y\\+MqvmuHq7TxtkQQQI57bZ/hAU8ZYWBTM74XSmcQ', // package-lock.json:4196
			'TSfVAu49jYC4BvQ4Sms9SZgdqGBgroqfDhJdTyKQ', // package-lock.json:4245|4245
			'3wanS6Ce1MWjCzH6NnhPJ', // package-lock.json:4275
			'cnS2a5F2x\\+w5ppvTqObojTP7WiFG\\+kVZs9Inw\\+qQ', // package-lock.json:7140
			'32BBeABfUi8V60SQ5yR6G', // package-lock.json:7297
			'\\+Z/4UeDaLuSW\\+39JPeFgs4gCGqsrJHVZX0fUrx//', // package-lock.json:7354
			'5erio2h9jp5CHGwcybmxmVqHmnCBZeewlfJ0pex\\+', // package-lock.json:7410
			'8ebhBxrqftHWnyTFweJ5Q', // package-lock.json:7450
			'wnvdQcjq9TZjevvXzSUo7bfmw91saqMjzGS2xq91', // package-lock.json:7464|7464
			'LOPw8FpgdQF9etWMaAfG/WRthIdXJGYp4mJ2Jgn/', // package-lock.json:7573
			'AicPrAC7Qu1JxPCZ9ZgCZlY35QgFnNqc', // package-lock.json:7653
			'TTlYpa\\+OL\\+vMMNG24xSlQGEJ3B/RzEfUlLct7b5G', // package-lock.json:7684
			'wPrplCpVMFuwzXbkecJrb6IYo1iFb0S9v37754mg', // package-lock.json:7684
			'6BctqTVQiBP3YUJ9C6DQOXJmkYR9X9fCLtCOJc5w', // package-lock.json:7690|7690
			'Gd2UZBJDkXlY7GbJxfsE8', // package-lock.json:7723
			'cBBzwBcNDWoFxt2XEFIpQ', // package-lock.json:7845
			'\\+DBzw/OCkmWaLAHlAyQiE2wxUOmAGVdasP9Yw93E', // package-lock.json:7871
			'mbKkMdQKsjX4BAL4bRYTj21edOf8cN7XHdYUJEe\\+', // package-lock.json:8007
			'Zn99hVEYcMvKPct1IqNe7', // package-lock.json:8007
			'JGboMidrGRY1Y77ncjiHR', // package-lock.json:8088
			'/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g', // package-lock.json:8094
			'MjqsvNwyz1s0k81Goz/9vRBe9SZdB09Bdw\\+/zYyO', // package-lock.json:8099
			'NrQHlS/V/qgv763EYudVwEcMQNxd2lh\\+0VrUByXN', // package-lock.json:8136
			'YU6nrzlmT6hM8N5OUV0SA', // package-lock.json:8460
			'9serjQBIztjRz6FkJez9D/hleyAXTBGLwwZUw9lA', // package-lock.json:8522
			'9serjQBIztjRz6FkJez9D', // package-lock.json:8522
			'/4vDM54WJsJio3XNn6K2sCG\\+CQ8G5Wz6bZhRZoAe', // package-lock.json:8531
			'a7rwh3UA02vjTsqlhODbn', // package-lock.json:8611
			'7iAgiMkLhSbaZxUqmrprw', // package-lock.json:8712
			'YTdrdZheS8TFwvkbLWf/G5KNJDCh6pKL5OZctEW4', // package-lock.json:8767
			'cwESVXlO3url9YWlFW/TA9cshCEhtu7IKJ/p5soJ', // package-lock.json:8813
			'LbqTKRAQ5kw8A90rA6fr4riOUpTZvQZA', // package-lock.json:8830
			'eEQ97k66aiEVpNnapVj90', // package-lock.json:8850
			'Y9kPzjGvIZ5jchSlqlCpBW3I82zBBL4z', // package-lock.json:8964
			'OluM0Nl\\+Ygr/tZ/0u9IbdwqtBoHspam3A17ThTig',
			'getNeo4jResolverNames', // schema/index.js:30|45, server/graphql/resolvers.js:4|8
			'tech@lt\\.com' // scripts/load-testing/lib/generate/team.js:27
		]
	}
};
