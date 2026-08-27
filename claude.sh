#!/bin/bash

TASK_PROMPT="Read /app/.task.md.
Execute the tasks described within.

Make the necessary code changes, and generate a short concise commit message for changes 
and save it to /app/.commit.md."

docker run -t --rm --network=talisman --name camel-kameleon-sandbox \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  -v claude-config:/home/default \
  -v "$HOME/.claude":/home/default/.claude \
  claude-sandbox \
  --dangerously-skip-permissions \
  --verbose \
  --effort medium \
  -p "$TASK_PROMPT"

# Capture the exit code of docker run
STATUS=$?

# Send push notification to your phone based on outcome
if [ $STATUS -eq 0 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Kameleon Task Complete!"}' \
    https://hooks.slack.com/services/$SLACK_TOKEN
else
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"Kameleon run exited with error code $STATUS.\"}" \
    https://hooks.slack.com/services/$SLACK_TOKEN  
fi