PAYLOAD='{
  "systemCode": "'"$SYSTEM_CODE"'",
  "environment": "'"$RELEASE_ENV"'",
  "notifications": {
    "slackChannels": ["rel-eng-changes"]
  },
  "user": {
    "email": "heroku-deploy-hook@ft.com"
  },
  "extraProperties": {
    "herokuEnv": {
      "appId": "'"$HEROKU_APP_ID"'",
      "releaseVersion": "'"$HEROKU_RELEASE_VERSION"'"
    }
  }
}'

curl -X POST https://api.ft.com/change-log/v1/create \
-H "Content-Type: application/json" \
-H 'x-api-key: '"$CHANGE_API_KEY"'' \
-d "$PAYLOAD"