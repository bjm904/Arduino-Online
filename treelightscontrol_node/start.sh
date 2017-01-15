#!/bin/bash
cd "$(dirname "$0")"
screen -dmS treelightscontrol_node sh
screen -p 0 -S treelightscontrol_node -X stuff "nodemon treelightscontrol_node.js
"

