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
			'E7AdgFBVeAPVMNcKGsHMA', // package-lock.json:53|442|786|1823|1911|2191|2370|4698|7823|7951|8286|8530
			'ts5T58OAqqXaOcCvaI7UF', // package-lock.json:143
			'Y9Ssr2b0bFr9pBRsXy9eudPhI\\+/O4yqegSUsnLdF', // package-lock.json:234
			'kx4hcvO3TTDFQ9CuTprtzdcVyA11iqG7iOMOt7vA', // package-lock.json:243|243
			'YU6nrzlmT6hM8N5OUV0SA', // package-lock.json:466
			'\\+MRYDp0oSvlo2IL6rQWA10PQi7tDUM3eqMSltXmY', // package-lock.json:595
			'7N3P3qNtAlv7X0d9bI28w', // package-lock.json:595
			'2eis5WqQGV7peooDyLmNEPUrps9\\+SXX5c9pL3xEB', // package-lock.json:715|1391|2069|4449|4762|4953|6282|6697|8024
			'/hhIC9OoO\\+KLpu9IJTS9j4DRVJ3aDDF9cMSoa2lw', // package-lock.json:734
			'QIZrnhueC1W0gYlDEeaPr', // package-lock.json:748
			'TNPjfTr432qx7yOjQyaXm3dSR0MH9vXp7eT1BFSl', // package-lock.json:802|802
			'qhAVI1\\+Av2X7qelOfAIYwXONood6XlZE/fXaBSmW', // package-lock.json:855
			'WclKAEzWH47lCdplFocUM', // package-lock.json:1062
			'\\+if6uywV0nDGoiydJRy4yk7h9od5Og0kxx4zUXmw', // package-lock.json:1187
			'NUqtwOAps4mk2Zob89MWXMHjHWg9milF', // package-lock.json:1217
			'hYD5i0aPN5QwZisEbDStI', // package-lock.json:1304
			'OX8XqP7/1a9cqkxYw2yXss15f26NKWBpDXQd0/uK', // package-lock.json:1322|5455
			'\\+3Uk5DYh6/1eKO0m0YmJFGNmFHGACpf1ClL1nmlV', // package-lock.json:1336
			'\\+C10TsW4PURY/ic\\+eaysnSkwB4kA/mBlCyy/IKDJ', // package-lock.json:1510
			'CqY0fNae93ZHTd20snh9ZLr8mTzIL9m0APQ1pjQg', // package-lock.json:1519|1519
			'/1x1EbZB7phzYu7vCr1v3ONuzDtX8WjuM9c0iYxe', // package-lock.json:1631
			'FHyH341ZrbnMUpe\\+5Bocte9xkmFMzPMjRaZMcXww', // package-lock.json:1712
			'xxHRdYnKtcECzVg7xOWhflvJMnqcFZjw', // package-lock.json:1728
			'\\+A9DVCndXfkeFUd3byderg\\+EbDkfnevfCwynWaNA', // package-lock.json:1733
			'A9DVCndXfkeFUd3byderg', // package-lock.json:1733
			'SRUReLS5Q8a7GxtRdxEBVZpm98rJM7Sb', // package-lock.json:1733
			'oTZqweIP51xaGPI4uPa56', // package-lock.json:1919
			'eRzhrN1WSINYCDCbrz796z37LOe3m5tmW7RQf6oBntukAG1nmovJvhnwHHRMAfeoItc1m2Hk02WER2aQ', // package-lock.json:1924
			'zhSCtt8v2NDrRlPQpCNtw', // package-lock.json:1968|2199|7831
			'/TmU\\+\\+01ANae4BAjBT\\+Dbr9k929OV1EFkuSOsACA', // package-lock.json:1975
			'Dbr9k929OV1EFkuSOsACA', // package-lock.json:1975
			'/6WlbVge9bhM74OpNPQPMGUToDtz\\+KXa1PneJxOA', // package-lock.json:1995|3884|4890|5690
			'YEwgwAXU9cI67NIda0kJk', // package-lock.json:2229
			'Fs9VRguL0gqGHkXS5GQiMCr1VhZBxz0JnJs4JmMp', // package-lock.json:2239|2239
			'PaQqUC9SRmAiSA9CCCYd4', // package-lock.json:2488|3270|5210
			'GctZ27nHfpt9THOdRZNgyJ9FZchYO1ceg5S8Q3DNLCKYy44nCZzgCJgcvx2UM8czmqak5BCxJMrq37lA', // package-lock.json:2542
			'qtAdSvaUpEbBsDwDyxYFgLZ0lTojfH7K', // package-lock.json:2568
			't/l0DFSMuSlDoWaI9JWIyPwK0jyE1bph//CUEL65', // package-lock.json:2580
			'\\+VyEfz2rMJgLZSS1v30OxPQe1cN0LZA1xbcaVfWA', // package-lock.json:2617
			'0F2r9T6k4ydGYhecl7YUBxBVxhL5oisPsNxAPe2g', // package-lock.json:2677|2677
			'6BctqTVQiBP3YUJ9C6DQOXJmkYR9X9fCLtCOJc5w', // package-lock.json:2740|2740|6128|6128|7717|7717
			'5y4gQJQzoGY2YCPdaIekE', // package-lock.json:2890
			'JAzQV4WpoY5WHcG0S0HHY', // package-lock.json:2993
			'rYj24lkinxf69blJbnsvtqqNU\\+L3SL50vzZhXOnw', // package-lock.json:3097
			'jVMFbYir2bp6bAj8efFNxWqHX0dIss6fJQ\\+/\\+qeQ', // package-lock.json:3281
			'/\\+\\+YKmP51OdWeGPuqCOba6kk2OTe5d02VmTB80Pw', // package-lock.json:3383|5281|6612
			'wOcfdRHaZ7VWtqCztfHri', // package-lock.json:3383|5281|6612
			'Df2Y9akRFxbdU13aZJL2e', // package-lock.json:3418
			'qgDYXFSR5WvEfuS5dMj6oTMEbrrSaM0CrFk2Yiq/', // package-lock.json:3511
			'/kL\\+oeZqzlYYYLQBwXVBlVzIsZwBqGREnOro24oC', // package-lock.json:3665
			'\\+Nb/6l093lx4OQ0foGWNRoc19mWy7BzL\\+UAK2iVg', // package-lock.json:3696|5543
			'sAqqVW3YtEVoFQ7J0blT8', // package-lock.json:3794
			'whzbngPNPTAhOY2iGycIU', // package-lock.json:3799
			'\\+PjyTTMMeNQC4DZw5AwfvelsUrA6B67NKMqXDbzQ', // package-lock.json:3842
			'QahvxwQZXKygOQ256myeN', // package-lock.json:3842
			'DxoQYYdhKgVAfqVy4pzXRZELHOIewzoesxpjYvpU', // package-lock.json:4032|4032
			'TSfVAu49jYC4BvQ4Sms9SZgdqGBgroqfDhJdTyKQ', // package-lock.json:4062|4062
			'3MYsjlwGTi0tjQ9ANXZu4', // package-lock.json:4366
			't5Zpu0LstAn4PVg8rVLKF', // package-lock.json:4627
			'lIbgIIQA3lz5XaB6vxakj6sDHADJiZadYEJB\\+FgA', // package-lock.json:5188
			'phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns', // package-lock.json:5216
			'/LYKLD\\+vquv9Pj4F\\+dj808MdHbuQLD7S4ACRjcX\\+', // package-lock.json:5466
			'Qkcp7P2ygktpMPh2mCQZaf3jhN6D3Z/qVZHSdWvQ', // package-lock.json:5613
			'/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g', // package-lock.json:5622|8104
			'/ad/2oNbKtW9Hgovl5O1FvFWKkKblNXoN/Oou6\\+9', // package-lock.json:5756
			'Y/OtIaXtUPr4/YpMv1pCL5L5ed0rumAaAeBSj12F', // package-lock.json:5887
			'PBrfhx6pzWyUMbbqK9dKD', // package-lock.json:5947|7352
			'TTlYpa\\+OL\\+vMMNG24xSlQGEJ3B/RzEfUlLct7b5G', // package-lock.json:6112|7711
			'wPrplCpVMFuwzXbkecJrb6IYo1iFb0S9v37754mg', // package-lock.json:6112|7711
			'mbKkMdQKsjX4BAL4bRYTj21edOf8cN7XHdYUJEe\\+', // package-lock.json:6307|8037
			'Zn99hVEYcMvKPct1IqNe7', // package-lock.json:6307|8037
			'/fxS2pBo2jbfcFRVuFZ/oFC\\+vZz0MNNk0h80iMn5', // package-lock.json:6355
			'/0sO6neh2jqRDVHOQ4o/LMea0tgCkbMgea5ip/e\\+', // package-lock.json:6371
			'\\+M/ETfHxQUK0oXg8ctgVnl9t3rosNVsZ1jG61nDA', // package-lock.json:6381
			'NrQHlS/V/qgv763EYudVwEcMQNxd2lh\\+0VrUByXN', // package-lock.json:6387|8146
			'evKGRg15UJHGB9X5j5Z3AFbgZvjUh2yq', // package-lock.json:6938
			'2e8H3Od7mQK4o6j6SzHD4', // package-lock.json:6974
			'\\+udGBeTbFnERA\\+lF541DDpMawzo4z6W/QrzNM18D', // package-lock.json:7054
			'\\+RSG9DL7uEwRUZXZn3SS34DiDPfzP0VOiEwtUWlE', // package-lock.json:7086
			'cnS2a5F2x\\+w5ppvTqObojTP7WiFG\\+kVZs9Inw\\+qQ', // package-lock.json:7232
			'32BBeABfUi8V60SQ5yR6G', // package-lock.json:7358
			'\\+Z/4UeDaLuSW\\+39JPeFgs4gCGqsrJHVZX0fUrx//', // package-lock.json:7415
			'8ebhBxrqftHWnyTFweJ5Q', // package-lock.json:7506
			'wnvdQcjq9TZjevvXzSUo7bfmw91saqMjzGS2xq91', // package-lock.json:7520|7520
			'LOPw8FpgdQF9etWMaAfG/WRthIdXJGYp4mJ2Jgn/', // package-lock.json:7600
			'Gd2UZBJDkXlY7GbJxfsE8', // package-lock.json:7759
			'cBBzwBcNDWoFxt2XEFIpQ', // package-lock.json:7878
			'JGboMidrGRY1Y77ncjiHR', // package-lock.json:8098
			'MjqsvNwyz1s0k81Goz/9vRBe9SZdB09Bdw\\+/zYyO', // package-lock.json:8109
			'9serjQBIztjRz6FkJez9D/hleyAXTBGLwwZUw9lA', // package-lock.json:8442
			'9serjQBIztjRz6FkJez9D', // package-lock.json:8442
			'7iAgiMkLhSbaZxUqmrprw', // package-lock.json:8636
			'YTdrdZheS8TFwvkbLWf/G5KNJDCh6pKL5OZctEW4', // package-lock.json:8660
			'cwESVXlO3url9YWlFW/TA9cshCEhtu7IKJ/p5soJ', // package-lock.json:8706
			'LbqTKRAQ5kw8A90rA6fr4riOUpTZvQZA', // package-lock.json:8723
			'eEQ97k66aiEVpNnapVj90', // package-lock.json:8743
			'j4tCjkF/n89iBNGBMJcR\\+dMUqxgPNgoSs6fVygPi', // package-lock.json:8766
			"\\+\\+wLYcrP\\+ZK7Zhb63olXZQO8Kb1oSv1Vvpm10yG0",
			"/TaTFH0B8qNmn\\+6NbI6crLkQonbedViVz7O2w8QV", // package-lock.json
			"kyEyQEagBC5mBEFlIYvdg", // package-lock.json
			"69XqVH7D53Vnfgf6mgKO5bp1HVFpWfTJ", // package-lock.json
			"\\+uITPY0989iXVfKvhwtmJocTaYoc/3khEHmEmvfY", // package-lock.json
			"SVeJBDM/gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB", // package-lock.json
			"gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB", // package-lock.json
			"\\+Q/GWH5wIG60bpt8CTwBklCSzQdEHmRUgAdEQKxw", // package-lock.json
			"gUbWqG4dIpJedwwOhe1cvGUq5tGmcTTIRkPiAbyh", // package-lock.json
			"gUbWqG4dIpJedwwOhe1cvGUq5tGmcTTIRkPiAbyh", // package-lock.json
			"P1tKYHVSZ6uFo26mtnve4HQFE3koh1UWVkp8YUC\\+", // package-lock.json
			"y\\+MqvmuHq7TxtkQQQI57bZ/hAU8ZYWBTM74XSmcQ", // package-lock.json
			"XdVfAjGlDKU2nqoGgycxTndkJ5fdwvWJ", // package-lock.json
			"5erio2h9jp5CHGwcybmxmVqHmnCBZeewlfJ0pex\\+", // package-lock.json
			"Y9kPzjGvIZ5jchSlqlCpBW3I82zBBL4z", // package-lock.json
			'getNeo4jResolverNames', // schema/index.js:30|45, server/graphql/resolvers.js:4|8
			'tech@lt\\.com' // scripts/load-testing/lib/generate/team.js:28
		]
	}
};
